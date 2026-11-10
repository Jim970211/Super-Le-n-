const test = require('node:test');
const assert = require('node:assert/strict');

const { createTask, filterTasks, getTaskSummary } = require('./script.js');

test('createTask devuelve una tarea válida', () => {
  const task = createTask({ text: 'Estudiar React', priority: 'high', dueDate: '2026-11-12' });

  assert.equal(task.text, 'Estudiar React');
  assert.equal(task.priority, 'high');
  assert.equal(task.dueDate, '2026-11-12');
  assert.equal(task.completed, false);
});

test('filterTasks filtra por estado', () => {
  const tasks = [
    createTask({ text: 'Tarea 1', priority: 'low' }),
    createTask({ text: 'Tarea 2', priority: 'high', completed: true }),
  ];

  assert.equal(filterTasks(tasks, 'all').length, 2);
  assert.equal(filterTasks(tasks, 'active').length, 1);
  assert.equal(filterTasks(tasks, 'completed').length, 1);
});

test('getTaskSummary cuenta tareas totales, pendientes y completadas', () => {
  const tasks = [
    createTask({ text: 'A', priority: 'low' }),
    createTask({ text: 'B', priority: 'medium', completed: true }),
    createTask({ text: 'C', priority: 'high', completed: true }),
  ];

  const summary = getTaskSummary(tasks);

  assert.deepEqual(summary, {
    total: 3,
    pending: 1,
    completed: 2,
  });
});
