import axios from 'axios';

/**
 * Crea una instancia de Axios pre-configurada.
 *
 * En producción (`docker-compose.prod.yml`):
 * - `import.meta.env.VITE_API_URL` será "/api".
 * - Las peticiones se harán a rutas como "/api/users/register".
 *
 * En desarrollo (`docker-compose.yml`):
 * - `import.meta.env.VITE_API_URL` será "http://localhost:9000".
 * - Las peticiones se harán a "http://localhost:9000/api/users/register".
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export default apiClient;

