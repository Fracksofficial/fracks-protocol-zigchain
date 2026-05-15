import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("HTTP");
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Basic request logging for debugging and activity tracking.
  app.use(
    (
      req: { method: string; originalUrl: string },
      res: { statusCode: number; on: (event: "finish", cb: () => void) => void },
      next: () => void
    ) => {
    const start = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const status = res.statusCode;
      const level = status >= 500 ? "error" : status >= 400 ? "warn" : "log";
      const message = `${req.method} ${req.originalUrl} ${status} ${durationMs}ms`;
      if (level === "error") {
        logger.error(message);
      } else if (level === "warn") {
        logger.warn(message);
      } else {
        logger.log(message);
      }
    });
      next();
    }
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

bootstrap();
