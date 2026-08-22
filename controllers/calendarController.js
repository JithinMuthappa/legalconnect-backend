const CalendarEvent = require('../models/calendarEventModel');

const eventFields = (body) => ({
  title: typeof body.title === 'string' ? body.title.trim() : '',
  description: typeof body.description === 'string' ? body.description.trim() : '',
  eventAt: body.event_at,
  reminderAt: body.reminder_at,
});

const validEvent = (event) => event.title && !Number.isNaN(Date.parse(event.eventAt));

const list = async (req, res) => {
  try {
    res.json({ success: true, events: await CalendarEvent.listEvents(req.user.id) });
  } catch (error) {
    console.error('List calendar events error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load calendar events' });
  }
};

const create = async (req, res) => {
  const event = eventFields(req.body);
  if (!validEvent(event)) return res.status(400).json({ success: false, message: 'A title and valid event date are required' });
  if (event.reminderAt && Number.isNaN(Date.parse(event.reminderAt))) return res.status(400).json({ success: false, message: 'Invalid reminder date' });
  try {
    res.status(201).json({ success: true, event: await CalendarEvent.createEvent(req.user.id, event) });
  } catch (error) {
    console.error('Create calendar event error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create calendar event' });
  }
};

const update = async (req, res) => {
  const event = eventFields(req.body);
  if (!validEvent(event)) return res.status(400).json({ success: false, message: 'A title and valid event date are required' });
  try {
    const updated = await CalendarEvent.updateEvent(req.user.id, Number(req.params.id), event);
    if (!updated) return res.status(404).json({ success: false, message: 'Calendar event not found' });
    res.json({ success: true, event: updated });
  } catch (error) {
    console.error('Update calendar event error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update calendar event' });
  }
};

const remove = async (req, res) => {
  try {
    const deleted = await CalendarEvent.removeEvent(req.user.id, Number(req.params.id));
    if (!deleted) return res.status(404).json({ success: false, message: 'Calendar event not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete calendar event error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete calendar event' });
  }
};

module.exports = { list, create, update, remove };
