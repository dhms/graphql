import { db } from "./teste-utils";

db.sequelize.sync({force: true})
    .then(() => run());