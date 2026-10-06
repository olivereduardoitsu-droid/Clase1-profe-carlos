// Application setup: middlewares and module mounting. It does not open any
// port.
//
// ORDER IS THE DESIGN. Each middleware only sees what ran before it, so the
// position answers "what must already be true when this one runs?":
//   requestId       every request gets one identifier, before anything can fail
//   requestLogger   wraps everything below and writes on the response 'finish'
//   corsPolicy      preflights are answered before parsing or routing
//   express.json()  a malformed body becomes an error from here on
//   healthRoutes    mounted BEFORE authentication: a monitor has no token
//   modules         /requests runs behind `authenticate`
//   notFound        runs only when no route matched
//   errorHandler    LAST — an error middleware only sees what ran before it
import express from 'express';
import { requestId } from './middleware/request-id.js';
import { requestLogger } from './middleware/request-logger.js';
import { corsPolicy } from './middleware/cors.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRoutes } from './routes/health.routes.js';
import { authenticate } from './middleware/authenticate.js';
import authRoutes from './modules/auth/auth.routes.js';
import requestsRoutes from './modules/requests/requests.routes.js';

const app = express();

// 1. The id must exist before anything can fail, so a rejected preflight or
//    an unparsable body is as traceable as a normal request.
app.use(requestId);

// 2. The logger wraps everything that can answer, and writes on 'finish'.
app.use(requestLogger);

// 3. CORS first among the responders: preflights ask for permission, not data.
app.use(corsPolicy);

// 4. Parses incoming JSON bodies into req.body.
app.use(express.json());

// 5. /health and /ready are public and mounted early: an orchestrator polls
//    them without a token.
app.use(healthRoutes);

// 6. /auth mixes public routes (register, login) and one protected route
// (/me), so the module applies `authenticate` internally where needed.
app.use('/auth', authRoutes);

// 7. Every requests route needs a trusted actor: authenticate runs first and
// builds req.auth, or the error handler answers 401 and the router never runs.
app.use('/requests', authenticate, requestsRoutes);

// 8. Nothing matched.
app.use(notFound);

// 9. Everything that failed becomes a response here.
app.use(errorHandler);

export default app;
