import express from "express";
import cors from "cors"
import * as dotenv from 'dotenv';
import routes from "./routes";
import swaggerUi from "swagger-ui-express";
import SwaggerDocs from "../src/swagger.json";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/doc-api", swaggerUi.serve, swaggerUi.setup(SwaggerDocs))

app.use(cors());

app.use(routes);

const PORT = process.env.PORT || 3000


app.listen(PORT, () => (
    console.log("Http server running! on port " + PORT)
));

