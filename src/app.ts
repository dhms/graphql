import * as cors from 'cors';
import * as compression from 'compression';
import * as helmet from 'helmet';
import * as express from 'express';
import * as graphqlHTTP from 'express-graphql';
import schema from './graphql/schema';

import db from './models';
import { extractJwtMiddleware } from './middlewares/extract-jwt.middleware';
import { DataLoaderFactory } from './graphql/dataloaders/DataLoaderFactory';
import { RequestedFields } from './graphql/ast/RequestedFields';

class App{

    private dataLoaderFactory: DataLoaderFactory;
    private requestedFields: RequestedFields;
    public express: express.Application;

    constructor(){
        this.express = express();
        this.init();
    }

    private init(): void{
        
        this.requestedFields = new RequestedFields();
        this.dataLoaderFactory = new DataLoaderFactory(db, this.requestedFields);
        this.middleware();
    }

    private middleware(): void{

        this.express.use(cors({
            origin: "*",
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Enconding'],
            preflightContinue: false,
            optionsSuccessStatus: 204
        }));

        this.express.use(compression());
        this.express.use(helmet());

        this.express.use('/graphql', 

            extractJwtMiddleware(),

            (req, res, next) => {                
                req['context']['db'] = db;
                req['context']['dataloaders'] = this.dataLoaderFactory.getLoaders();
                req['context']['requestedFields'] = this.requestedFields;
                next();
            },

            graphqlHTTP((req) => ({
                schema: schema,
                graphiql: true,
                context: req['context']
            }))
        )
    }
}

export default new App().express;