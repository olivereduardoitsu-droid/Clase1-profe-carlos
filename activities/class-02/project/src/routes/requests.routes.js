import express from 'express';
import { requests, generateId } from '../data/requests.js';

const router = express.Router();

// This router is mounted at /requests in app.js, so '/' here means GET /requests.

// Listing is a read of the collection. An optional ?status= query filters how
// the collection is presented; it does not change which resource is addressed.
router.get('/', (req, res) => {
  const { status } = req.query;

  if (typeof status !== 'string') {
    return res.json(requests);
  }

  res.json(requests.filter((item) => item.status === status));
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const request = requests.find((item) => item.id === id);

  // A resource that does not exist is a legitimate outcome of a lookup,
  // not a server failure: the state says so with 404 and an error body.
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  res.json(request);
});

router.post('/', (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';

  // An incomplete petition is the client's fault: 400 without generating an
  // id or touching the stored data.
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  // id and status are always assigned by the server, whatever the client sent.
  const newRequest = {
    id: generateId(),
    title,
    description: req.body.description,
    status: 'open',
    priority: req.body.priority
  };

  requests.push(newRequest);

  // Creation produces a resource that did not exist before: 201 Created.
  res.status(201).json(newRequest);
});

// Unknown subpaths of /requests keep the error body uniform across the API.
router.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default router;
