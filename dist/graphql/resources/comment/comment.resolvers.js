"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils/utils");
exports.commentResolvers = {
    Comment: {
        user: (comment, { id }, { db }, info) => {
            return db.User
                .findById(comment.get('user')).catch(utils_1.handleError);
        },
        post: (comment, { id }, { db }, info) => {
            return db.Post
                .findById(comment.get('post')).catch(utils_1.handleError);
        }
    },
    Query: {
        commentsByPost: (parent, { id, first = 10, offset = 0 }, { db }, info) => {
            return db.Comment
                .findAll({
                where: { post: id },
                limit: first,
                offset: offset
            }).catch(utils_1.handleError);
        },
    },
    Mutation: {
        createComment: (parent, { input }, { db }, info) => {
            return db.sequelize.transaction((t) => {
                return db.Comment.create(input, {
                    transaction: t
                });
            }).catch(utils_1.handleError);
        },
        updateComment: (parent, { id, input }, { db }, info) => {
            id = parseInt(id);
            return db.sequelize.transaction((t) => {
                return db.Comment
                    .findById(id)
                    .then((comment) => {
                    if (comment)
                        throw new Error(`Comment with id ${id} not found`);
                    return comment.update(input, {
                        transaction: t
                    });
                });
            }).catch(utils_1.handleError);
        },
        deleteComment: (parent, { id }, { db }, info) => {
            id = parseInt(id);
            return db.sequelize.transaction((t) => {
                return db.Comment
                    .findById(id)
                    .then((comment) => {
                    if (comment)
                        throw new Error(`Comment with id ${id} not found`);
                    return comment.destroy({ transaction: t })
                        .then(comment => true)
                        .catch(error => {
                        // poderia fazer alguma manipulação do erro aqui
                        return false;
                    });
                });
            }).catch(utils_1.handleError);
        }
    }
};
