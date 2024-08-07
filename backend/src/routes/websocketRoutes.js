import { handleConnection } from '../controllers/webSocketController.js';

function handleConnectionWrapper(ws, req) {
  handleConnection(ws, req);
}

export { handleConnectionWrapper as handleConnection };
