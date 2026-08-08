import './App.css';
import { useState, useEffect } from 'react';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const EMOJI_CATEGORIES = {
  General: ['🎉', '📌', '⭐', '✨', '💡', '🔔', '⏰', '🎥', '🍿', '📢', '💭', '👥'],
  Work: ['💼', '📊', '🖥️', '📝', '📞', '🚀', '🎯'],
  Celebrations: ['🎂', '🥳', '🎈', '🎁', '🍰', '🥂'],
  Travel: ['🏠', '✈️', '🌍', '🏖️', '🏕️', '🚗', '🚆', '🚢'],
  Fitness: ['🏋️', '🏃', '🚴', '🧘', '⚽', '🏀', '🎾'],
  'Food & Drink': ['🍽️', '🍕', '🍔', '🥗', '🍜', '☕', '🍷', '🍻'],
  Learning: ['📚', '📖', '✏️', '🎓', '🧠', '🔬'],
  Tools: ['🛒', '🧹', '🔨', '🔧', '🛠️', '📦', '🌱'],
  Pets: ['🐶', '🐱', '🐾'],
  Finance: ['💰', '💳', '🏦', '🧾'],
  Health: ['💊', '🌡️', '🩹', '💉', '🩺'],
  Feelings: ['❤️', '💙', '💜', '💚', '🧡', '💛', '😊'],
  Misc: ['🧩', '⚙️', '🤖', '🔥', '🌙'],
};

const COLOR_OPTIONS = [
  '#0369a1', '#0284c7', '#0ea5e9', '#06b6d4', '#3b82f6', '#4f46e5', '#6366f1', '#7c3aed', '#8b5cf6', '#9333ea', '#c026d3', '#ec4899', '#db2777', '#e11d48', '#f43f5e', '#ef4444', '#f97316', '#ea580c', '#f59e0b', '#ca8a04', '#65a30d', '#22c55e', '#10b981', '#15803d', '#0f766e', '#14b8a6', '#64748b',
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_CELL_HEIGHT = 110;
const BAR_TOP_OFFSET = 1;
const HOUR_ROW_HEIGHT = 40; // px — must match .schedule-hour-row height in CSS

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function getCalendarGrid(year, month) {
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const grid = [];

  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const d = new Date(year, month - 1, day);
    grid.push({ day, currentMonth: false, year: d.getFullYear(), month: d.getMonth() });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    grid.push({ day, currentMonth: true, year, month });
  }
  let nextMonthDay = 1;
  while (grid.length % 7 !== 0) {
    const d = new Date(year, month + 1, nextMonthDay);
    grid.push({ day: nextMonthDay, currentMonth: false, year: d.getFullYear(), month: d.getMonth() });
    nextMonthDay++;
  }
  return grid;
}

function formatDateKey(year, month, day) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function isToday(cell) {
  const today = new Date();
  return (
    cell.year === today.getFullYear() &&
    cell.month === today.getMonth() &&
    cell.day === today.getDate()
  );
}

function formatTime(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatHourLabel(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function getEventsForCell(events, cell) {
  const dateKey = formatDateKey(cell.year, cell.month, cell.day);
  return events.filter((ev) => {
    if (ev.recurring) {
      const start = new Date(ev.startDate + 'T00:00:00');
      const cellDate = new Date(cell.year, cell.month, cell.day);
      return (
        cellDate.getDay() === start.getDay() &&
        cellDate >= new Date(start.getFullYear(), start.getMonth(), start.getDate())
      );
    }
    return dateKey >= ev.startDate && dateKey <= ev.endDate;
  });
}

function chunkIntoWeeks(grid) {
  const weeks = [];
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7));
  }
  return weeks;
}

function getWeekSpanBars(events, week) {
  const spanningEvents = events.filter((ev) => ev.allDay || ev.startDate !== ev.endDate);
  const bars = [];

  spanningEvents.forEach((ev) => {
    let startCol = -1;
    let endCol = -1;

    week.forEach((cell, colIndex) => {
      const dateKey = formatDateKey(cell.year, cell.month, cell.day);
      if (dateKey >= ev.startDate && dateKey <= ev.endDate) {
        if (startCol === -1) startCol = colIndex;
        endCol = colIndex;
      }
    });

    if (startCol !== -1) {
      const dateKeyFirst = formatDateKey(week[0].year, week[0].month, week[0].day);
      const dateKeyLast = formatDateKey(week[6].year, week[6].month, week[6].day);
      bars.push({
        ev,
        startCol,
        endCol,
        continuesLeft: ev.startDate < dateKeyFirst,
        continuesRight: ev.endDate > dateKeyLast,
      });
    }
  });

  // Only stack bars that actually overlap in columns. Bars sitting in
  // separate, non-overlapping day ranges share lane 0 and both get to
  // use the full cell height instead of needlessly splitting it.
  bars.sort((a, b) => a.startCol - b.startCol || a.endCol - b.endCol);
  const laneEnds = [];
  bars.forEach((bar) => {
    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] >= bar.startCol) {
      lane++;
    }
    laneEnds[lane] = bar.endCol;
    bar.lane = lane;
  });

  return bars;
}

function getMonthlyTasks(events, year, month) {
  const tasks = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  events.forEach((ev) => {
    const start = new Date(ev.startDate + 'T00:00:00');

    if (ev.recurring) {
      const monthEnd = new Date(year, month, daysInMonth);
      if (start > monthEnd) return;

      let firstOccurrence = 1;
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month, d).getDay() === start.getDay()) {
          firstOccurrence = d;
          break;
        }
      }

      const effectiveDay =
        start.getFullYear() === year && start.getMonth() === month && start.getDate() > firstOccurrence
          ? start.getDate()
          : firstOccurrence;

      tasks.push({
        id: ev.id,
        sortKey: effectiveDay,
        time: ev.time,
        label: `Every ${fullDayNames[start.getDay()]}`,
        title: ev.title,
        emoji: ev.emoji,
        color: ev.color,
        recurring: true,
      });
    } else if (start.getFullYear() === year && start.getMonth() === month) {
      tasks.push({
        id: ev.id,
        sortKey: start.getDate(),
        time: ev.time,
        label: `${monthNames[month].slice(0, 3)} ${start.getDate()}`,
        title: ev.title,
        emoji: ev.emoji,
        color: ev.color,
        recurring: false,
      });
    }
  });

  tasks.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return (a.time || '').localeCompare(b.time || '');
  });

  return tasks;
}

function EventForm({ defaultDate, existingEvent, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(existingEvent?.title || '');
  const [emoji, setEmoji] = useState(existingEvent?.emoji || '🎉');
  const [color, setColor] = useState(existingEvent?.color || COLOR_OPTIONS[0]);
  const [startDate, setStartDate] = useState(existingEvent?.startDate || defaultDate);
  const [isMultiDay, setIsMultiDay] = useState(
    existingEvent ? existingEvent.startDate !== existingEvent.endDate : false
  );
  const [endDate, setEndDate] = useState(existingEvent?.endDate || defaultDate);
  const [isAllDay, setIsAllDay] = useState(existingEvent?.allDay || false);
  const [time, setTime] = useState(existingEvent?.time || '09:00');
const [endTime, setEndTime] = useState(existingEvent?.endTime || '10:00');
  const [isRecurring, setIsRecurring] = useState(existingEvent?.recurring || false);
  

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: existingEvent ? existingEvent.id : Date.now(),
      title: title.trim(),
      emoji,
      color,
      startDate,
      endDate: isMultiDay ? endDate : startDate,
      allDay: isAllDay,
      time: isAllDay ? null : time,
      endTime: isAllDay ? null : endTime,
      recurring: isRecurring,
    });

    onClose();
  };

  const handleDelete = () => {
    onDelete(existingEvent.id);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="event-form" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>{existingEvent ? 'Edit Event' : 'New Event'}</h3>

        <label>Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event name" autoFocus />

        <label>Emoji</label>
        <div className="emoji-picker-grouped">
          {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
            <div key={category} className="emoji-category">
              <div className="emoji-category-label">{category}</div>
              <div className="emoji-picker">
                {emojis.map((e) => (
                  <button
                    type="button"
                    key={e}
                    className={`emoji-option ${emoji === e ? 'selected' : ''}`}
                    onClick={() => setEmoji(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <label>Color</label>
        <div className="color-picker">
          {COLOR_OPTIONS.map((c) => (
            <button
              type="button"
              key={c}
              className={`color-option ${color === c ? 'selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        <label>Start date</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

        <label className="checkbox-label">
          <input type="checkbox" checked={isMultiDay} onChange={(e) => setIsMultiDay(e.target.checked)} />
          Spans multiple days
        </label>

        {isMultiDay && (
          <>
            <label>End date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </>
        )}

        <label className="checkbox-label">
          <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />
          All day
        </label>

        {!isAllDay && (
          <>
            <label>Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <label>End time</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </>
        )}

        <label className="checkbox-label">
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
          Repeat weekly on this day
        </label>

        <div className="form-actions">
          {existingEvent && (
            <button type="button" className="delete-btn" onClick={handleDelete}>Delete</button>
          )}
          <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="save-btn">{existingEvent ? 'Update' : 'Save'} Event</button>
        </div>
      </form>
    </div>
  );
}

function DaySchedule({ cell, events, onClose, onEditEvent }) {
  const cellEvents = getEventsForCell(events, cell);
  const allDayEvents = cellEvents.filter((ev) => ev.allDay);
  const timedEvents = cellEvents.filter((ev) => !ev.allDay);

  const timedBlocks = timedEvents.map((ev) => {
  const startMin = timeToMinutes(ev.time);
  const endMin = ev.endTime ? timeToMinutes(ev.endTime) : startMin + 30;
  const duration = Math.max(endMin - startMin, 15);
  return {
    ev,
    top: (startMin / 60) * HOUR_ROW_HEIGHT,
    height: (duration / 60) * HOUR_ROW_HEIGHT,
  };
});

  const dateObj = new Date(cell.year, cell.month, cell.day);
  const weekdayName = fullDayNames[dateObj.getDay()];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="day-schedule" onClick={(e) => e.stopPropagation()}>
        <div className="day-schedule-header">
          <h3>{weekdayName}, {monthNames[cell.month]} {cell.day}</h3>
          <button className="cancel-btn" onClick={onClose}>Close</button>
        </div>

        {allDayEvents.length > 0 && (
          <div className="schedule-allday-row">
            <span className="schedule-row-label">All day</span>
            <div className="schedule-allday-events">
              {allDayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="event-pill"
                  style={{ background: ev.color + '26', border: `1.5px solid ${ev.color}` }}
                  onClick={() => onEditEvent(ev)}
                >
                  <span className="event-emoji">{ev.emoji}</span>
                  <span className="event-title" style={{ color: ev.color }}>{ev.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

            <div className="schedule-hours">
              {HOURS.map((h) => (
                <div key={h} className="schedule-hour-row">
                  <span className="schedule-row-label">{formatHourLabel(h)}</span>
                  <div className="schedule-hour-line" />
                </div>
              ))}

              <div className="schedule-timed-events">
                {timedBlocks.map(({ ev, top, height }) => (
                  <div
                    key={ev.id}
                    className="schedule-event-block"
                    style={{
                      top,
                      height,
                      background: ev.color + '26',
                      borderColor: ev.color,
                      color: ev.color,
                    }}
                    onClick={() => onEditEvent(ev)}
                  >
                    <span className="schedule-event-dot" style={{ background: ev.color }} />
                    <span className="schedule-event-block-text">
                      {ev.emoji} {ev.title} · {formatTime(ev.time)}
                      {ev.endTime ? `–${formatTime(ev.endTime)}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
      </div>
    </div>
  );
}

function App() {
  const [scheduleDay, setScheduleDay] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('dark-mode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem('daily-todos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newTodoText, setNewTodoText] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);
  const [addEventDate, setAddEventDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [dragEventId, setDragEventId] = useState(null);
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('calendar-events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('dark-mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('calendar-events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('daily-todos', JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    const todayKey = formatDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const lastActiveDate = localStorage.getItem('todos-last-active-date');

    if (lastActiveDate && lastActiveDate !== todayKey) {
      setTodos((prev) => prev.map((t) => ({ ...t, done: false })));
    }

    localStorage.setItem('todos-last-active-date', todayKey);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const grid = getCalendarGrid(year, month);
  const monthlyTasks = getMonthlyTasks(events, year, month);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);
  const goToPrevYear = () => setCurrentDate(new Date(year - 1, month, 1));
  const goToNextYear = () => setCurrentDate(new Date(year + 1, month, 1));

  const addTodo = (e) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    setTodos([...todos, { id: Date.now(), text: newTodoText, done: false }]);
    setNewTodoText('');
  };

  const toggleTodo = (id) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTodo = (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const updateEvent = (updatedEvent) => {
    setEvents((prev) => prev.map((ev) => (ev.id === updatedEvent.id ? updatedEvent : ev)));
  };

  const deleteEvent = (id) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
  };

  const handleDrop = (targetCell) => {
    if (dragEventId === null) return;

    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== dragEventId) return ev;

        const oldStart = new Date(ev.startDate + 'T00:00:00');
        const oldEnd = new Date(ev.endDate + 'T00:00:00');
        const spanDays = Math.round((oldEnd - oldStart) / 86400000);

        const newStart = new Date(targetCell.year, targetCell.month, targetCell.day);
        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + spanDays);

        return {
          ...ev,
          startDate: formatDateKey(newStart.getFullYear(), newStart.getMonth(), newStart.getDate()),
          endDate: formatDateKey(newEnd.getFullYear(), newEnd.getMonth(), newEnd.getDate()),
        };
      })
    );

    setDragEventId(null);
  };

  const todayDate = new Date();
  const todayKey = formatDateKey(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());

  return (
    <div className={`calendar-page ${isDarkMode ? 'dark' : ''}`}>
      <div className="app-layout">
        <aside className="sidebar">
          <div className="mini-calendar">
            <div className="mini-calendar-header">
              <button className="mini-nav-btn" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>&lt;</button>
              <span>{monthNames[month]} {year}</span>
              <button className="mini-nav-btn" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>&gt;</button>
            </div>
            <div className="mini-calendar-grid">
              {dayNames.map((name) => (
                <div key={name} className="mini-day-name">{name[0]}</div>
              ))}
              {grid.map((cell, index) => {
                const cellEvents = getEventsForCell(events, cell)
                  .slice()
                  .sort((a, b) => {
                    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
                    return (a.time || '').localeCompare(b.time || '');
                  });

                return (
                  <div
                    key={index}
                    className={`mini-day-cell ${cell.currentMonth ? '' : 'faded'} ${isToday(cell) ? 'mini-today' : ''}`}
                    onClick={() => {
                      setCurrentDate(new Date(cell.year, cell.month, cell.day));
                      setScheduleDay(cell);
                    }}
                  >
                    <span>{cell.day}</span>
                    {cellEvents.length > 0 && (
                      <div className="mini-day-dots">
                        {cellEvents.slice(0, 4).map((ev) => (
                          <span key={ev.id} className="mini-day-dot" style={{ background: ev.color }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="todo-section">
            <h3>Daily To-do List</h3>
            <ul className="todo-list">
              {todos.map((todo) => (
                <li key={todo.id} className={todo.done ? 'done' : ''}>
                  <span className="todo-text" onClick={() => toggleTodo(todo.id)}>{todo.text}</span>
                  <button className="todo-delete-btn" onClick={() => deleteTodo(todo.id)}>×</button>
                </li>
              ))}
            </ul>
            <form onSubmit={addTodo} className="todo-form">
              <input
                type="text"
                placeholder="Add a task..."
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
              />
            </form>
          </div>
          <div className="monthly-tasks-section">
            <h3>Monthly Events</h3>
            <ul className="monthly-tasks-list">
              {monthlyTasks.length === 0 && <li className="no-tasks">No tasks this month</li>}
              {monthlyTasks.map((task, i) => (
                <li key={task.id + '-' + i} className="monthly-task-item">
                  <span className="task-emoji">{task.emoji}</span>
                  <span className="task-title">{task.title}</span>
                  <span className="task-label" style={{ color: task.color }}>{task.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="calendar-card">
          <div className="calendar-toolbar">
            <div className="toolbar-left">
              <select className="month-select" value={month} onChange={(e) => setCurrentDate(new Date(year, Number(e.target.value), 1))}>
                {monthNames.map((name, i) => (
                  <option key={name} value={i}>{name}</option>
                ))}
              </select>
              <button className="add-event-btn" onClick={() => { setAddEventDate(null); setShowEventForm(true); }}>+ Add Event</button>
            </div>
            <div className="toolbar-right">
              <button className="today-btn" onClick={() => setCurrentDate(new Date())}>Today</button>
              <button className="nav-btn" onClick={goToPrevYear}>&lt;</button>
              <span className="year-label">{year}</span>
              <button className="nav-btn" onClick={goToNextYear}>&gt;</button>
              <button className="dark-mode-btn" onClick={toggleDarkMode}>
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>

          <div className="calendar-grid-wrapper">
            <div className="calendar-grid">
              {dayNames.map((name) => (
                <div key={name} className="day-name">{name}</div>
              ))}
            </div>

            {chunkIntoWeeks(grid).map((week, weekIndex) => {
                const bars = getWeekSpanBars(events, week);
                const maxLanes = bars.length > 0 ? Math.max(...bars.map((b) => b.lane)) + 1 : 0;
                const barGap = 4;
                const barHeight =
                  maxLanes > 0
                    ? Math.max(18, (DAY_CELL_HEIGHT - BAR_TOP_OFFSET - (maxLanes - 1) * barGap) / maxLanes)
                    : 0;

              return (
                <div key={weekIndex} className="week-row">
                  <div className="week-cells">
                    {week.map((cell, colIndex) => {
                      const cellEvents = getEventsForCell(events, cell);
                      // Only single-day, non-all-day events show as small
                      // per-cell pills — everything else (all-day, or
                      // spanning multiple days) is drawn as a bar instead.
                      const timedEvents = cellEvents
                        .filter((ev) => !ev.allDay && ev.startDate === ev.endDate)
                        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                      const barsForDay = bars.filter((b) => colIndex >= b.startCol && colIndex <= b.endCol);
                      const maxLaneForDay = barsForDay.length > 0 ? Math.max(...barsForDay.map((b) => b.lane)) : -1;

                      return (
                        <div
                          key={colIndex}
                          className={`day-cell ${cell.currentMonth ? '' : 'other-month'}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDrop(cell)}
                          onClick={() => {
                            setAddEventDate(formatDateKey(cell.year, cell.month, cell.day));
                            setShowEventForm(true);
                          }}
                        >
                          <span className={`day-number ${isToday(cell) ? 'today' : ''}`}>{cell.day}</span>
                          {cell.currentMonth && cell.day === 1 && cellEvents.length === 0 && (
                            <span className="month-watermark">{monthNames[cell.month]}</span>
                          )}

                          <div
                            className="event-list"
                          style={{
                              marginTop: maxLaneForDay >= 0 ? BAR_TOP_OFFSET + (maxLaneForDay + 1) * (barHeight + barGap) : 0,
                          }}
                          >
                            {timedEvents.map((ev) => (
                              <div
                                key={ev.id}
                                className="event-pill"
                                style={{ background: ev.color + '26', borderColor: ev.color }}
                                draggable
                                onDragStart={() => setDragEventId(ev.id)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEvent(ev);
                                }}
                              >
                                <span className="event-emoji">{ev.emoji}</span>
                                <span className="event-title" style={{ color: ev.color }}>{ev.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="week-bars">
                    {bars.map((bar, i) => (
                      <div
                        key={bar.ev.id}
                        className="week-span-bar"
                        draggable
                        onDragStart={() => setDragEventId(bar.ev.id)}
                        style={{
                          gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}`,
                          top: BAR_TOP_OFFSET + bar.lane * (barHeight + barGap),                        height: barHeight,
                          background: bar.ev.color + '26',
                          borderColor: bar.ev.color,
                          color: bar.ev.color,
                          borderTopLeftRadius: bar.continuesLeft ? 0 : 8,
                          borderBottomLeftRadius: bar.continuesLeft ? 0 : 8,
                          borderTopRightRadius: bar.continuesRight ? 0 : 8,
                          borderBottomRightRadius: bar.continuesRight ? 0 : 8,
                          borderLeftWidth: bar.continuesLeft ? 0 : 1.5,
                          borderRightWidth: bar.continuesRight ? 0 : 1.5,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(bar.ev);
                        }}
                      >
                        {bar.continuesLeft && <span className="bar-arrow">‹</span>}
                        <span className="bar-emoji">{bar.ev.emoji}</span>
                        <span className="bar-title">{bar.ev.title}</span>
                        {bar.continuesRight && <span className="bar-arrow">›</span>}
                      </div>
                    ))} 
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {(showEventForm || editingEvent) && (
        <EventForm
          defaultDate={addEventDate || todayKey}
          existingEvent={editingEvent}
          onSave={editingEvent ? updateEvent : (newEvent) => setEvents((prev) => [...prev, newEvent])}
          onDelete={deleteEvent}
          onClose={() => {
            setShowEventForm(false);
            setEditingEvent(null);
            setAddEventDate(null);
          }}
        />
      )}

      {scheduleDay && (
        <DaySchedule
          cell={scheduleDay}
          events={events}
          onClose={() => setScheduleDay(null)}
          onEditEvent={(ev) => {
            setScheduleDay(null);
            setEditingEvent(ev);
          }}
        />
      )}
    </div>
  );
}

export default App;
