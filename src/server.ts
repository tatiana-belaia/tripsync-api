import { buildApp } from "./app";
import { db } from "./db";

const app = buildApp(db);

app.listen({ port: 3000 }).catch(console.error);
