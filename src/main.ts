import 'dotenv/config';
import { getExpressApp } from './lib/app';

(async (): Promise<void> => {
  const { app } = await getExpressApp();
  const port = +(process.env.HTTP_PORT as string);
  app.listen(port, () => console.log(`Listening on port: ${port}`));
})();
