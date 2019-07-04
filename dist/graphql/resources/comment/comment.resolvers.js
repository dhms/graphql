"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../../utils/utils");
const auth_resolver_1 = require("../../composable/auth.resolver");
const composable_resolver_1 = require("../../composable/composable.resolver");
exports.commentResolvers = {
    Comment: {
        user: (comment, { id }, { db, dataloaders: { userLoader } }, info) => {
            return userLoader
                .load({ key: comment.get('user'), info })
                .catch(utils_1.handleError);
        },
        post: (comment, { id }, { db, dataloaders: { postLoader } }, info) => {
            return postLoader
                .load({ key: comment.get('post'), info })
                .catch(utils_1.handleError);
        }
    },
    Query: {
        commentsByPost: (parent, { id, first = 10, offset = 0 }, context, info) => {
            return context.db.Comment
                .findAll({
                where: { post: id },
                limit: first,
                offset: offset,
                attributes: context.requestedFields.getFields(info)
            }).catch(utils_1.handleError);
        },
    },
    Mutation: {
        createComment: composable_resolver_1.compose(...auth_resolver_1.authResolvers)((parent, { input }, { db, authUser }, info) => {
            input.user = authUser.id;
            return db.sequelize.transaction((t) => {
                return db.Comment.create(input, {
                    transaction: t
                });
            }).catch(utils_1.handleError);
        }),
        updateComment: composable_resolver_1.compose(...auth_resolver_1.authResolvers)((parent, { id, input }, { db, authUser }, info) => {
            id = parseInt(id);
            return db.sequelize.transaction((t) => {
                return db.Comment
                    .findById(id)
                    .then((comment) => {
                    utils_1.throwError(!comment, `Comment with id ${id} not found`);
                    utils_1.throwError(comment.get('user') != authUser.id, 'Unauthorized! You can only edit comments by yourself');
                    input.user = authUser.id;
                    return comment.update(input, {
                        transaction: t
                    });
                });
            }).catch(utils_1.handleError);
        }),
        deleteComment: composable_resolver_1.compose(...auth_resolver_1.authResolvers)((parent, { id }, { db, authUser }, info) => {
            id = parseInt(id);
            return db.sequelize.transaction((t) => {
                return db.Comment
                    .findById(id)
                    .then((comment) => {
                    utils_1.throwError(!comment, `Comment with id ${id} not found`);
                    utils_1.throwError(comment.get('user') != authUser.id, 'Unauthorized! You can only edit comments by yourself');
                    return comment.destroy({ transaction: t })
                        .then(comment => true)
                        .catch(error => {
                        // poderia fazer alguma manipulação do erro aqui
                        return false;
                    });
                });
            }).catch(utils_1.handleError);
        })
    }
};
