"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt = require("jsonwebtoken");
const graphql_tools_1 = require("graphql-tools");
const query_1 = require("./query");
const mutation_1 = require("./mutation");
const comment_schema_1 = require("./resources/comment/comment.schema");
const post_schema_1 = require("./resources/post/post.schema");
const user_schema_1 = require("./resources/user/user.schema");
const utils_1 = require("../utils/utils");
const token_schema_1 = require("./resources/token/token.schema");
const composable_resolver_1 = require("./composable/composable.resolver");
const auth_resolver_1 = require("./composable/auth.resolver");
const resolvers = {
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
    Post: {
        author: (post, args, { db, dataloaders: { userLoader } }, info) => {
            return userLoader
                .load({ key: post.get('author'), info })
                .catch(utils_1.handleError);
        },
        comments: (post, { first = 10, offset = 0 }, context, info) => {
            return context.db.Comment
                .findAll({
                where: { post: post.get('id') },
                limit: first,
                offset: offset,
                attributes: context.requestedFields.getFields(info)
            }).catch(utils_1.handleError);
        }
    },
    User: {
        posts: (user, { first = 10, offset = 0 }, context, info) => {
            return context.db.Post
                .findAll({
                where: { author: user.get('id') },
                limit: first,
                offset: offset,
                attributes: context.requestedFields.getFields(info, { keep: ['id'], exclude: ['comments'] })
            }).catch(utils_1.handleError);
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
        posts: (parent, { first = 10, offset = 0 }, context, info) => {
            return context.db.Post
                .findAll({
                limit: first,
                offset: offset,
                attributes: context.requestedFields.getFields(info, { keep: ['id'], exclude: ['comments'] })
            }).catch(utils_1.handleError);
        },
        post: (parent, { id }, context, info) => {
            id = parseInt(id);
            return context.db.Post
                .findById(id, {
                attributes: context.requestedFields.getFields(info, { keep: ['id'], exclude: ['comments'] })
            })
                .then((post) => {
                if (post)
                    throw new Error(`Post with id ${id} not found`);
                return post;
            }).catch(utils_1.handleError);
        },
        users: (parent, { first = 10, offset = 0 }, context, info) => {
            return context.db.User
                .findAll({
                limit: first,
                offset: offset,
                attributes: context.requestedFields.getFields(info, { keep: ['id'], exclude: ['posts'] })
            }).catch(utils_1.handleError);
        },
        user: (parent, { id }, context, info) => {
            id = parseInt(id);
            return context.db.User
                .findById(id, {
                attributes: context.requestedFields.getFields(info, { keep: ['id'], exclude: ['posts'] })
            })
                .then((user) => {
                utils_1.throwError(!user, `User with id ${id} not found`);
                return user;
            }).catch(utils_1.handleError);
        },
        currentUser: composable_resolver_1.compose(...auth_resolver_1.authResolvers)((parent, args, context, info) => {
            return context.db.User
                .findById(context.authUser.id, {
                attributes: context.requestedFields.getFields(info, { keep: ['id'], exclude: ['posts'] })
            })
                .then((user) => {
                utils_1.throwError(!user, `User with id ${context.authUser.id} not found`);
                return user;
            }).catch(utils_1.handleError);
        })
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
        }),
        createPost: composable_resolver_1.compose(...auth_resolver_1.authResolvers)((parent, { input }, { db, authUser }, info) => {
            input.author = authUser.id;
            return db.sequelize.transaction((t) => {
                return db.Post.create(input, {
                    transaction: t
                });
            }).catch(utils_1.handleError);
        }),
        updatePost: composable_resolver_1.compose(...auth_resolver_1.authResolvers)((parent, { id, input }, { db, authUser }, info) => {
            id = parseInt(id);
            return db.sequelize.transaction((t) => {
                return db.Post
                    .findById(id)
                    .then((post) => {
                    utils_1.throwError(!post, `Post with id ${id} not found`);
                    utils_1.throwError(post.get('author') != authUser.id, 'Unauthorized! You can only edit posts by yourself');
                    input.author = authUser.id;
                    return post.update(input, {
                        transaction: t
                    });
                });
            }).catch(utils_1.handleError);
        }),
        deletePost: composable_resolver_1.compose(...auth_resolver_1.authResolvers)((parent, { id }, { db, authUser }, info) => {
            id = parseInt(id);
            return db.sequelize.transaction((t) => {
                return db.Post
                    .findById(id)
                    .then((post) => {
                    utils_1.throwError(!post, `Post with id ${id} not found`);
                    utils_1.throwError(post.get('author') != authUser.id, 'Unauthorized! You can only delete posts by yourself');
                    return post.destroy({ transaction: t })
                        .then(post => true)
                        .catch(error => {
                        // poderia fazer alguma manipulação do erro aqui
                        return false;
                    });
                });
            }).catch(utils_1.handleError);
        }),
        createToken: (parent, { email, password }, { db }) => {
            return db.User.findOne({
                where: { email: email },
                attributes: ['id', 'password']
            }).then((user) => {
                let errorMessage = 'Unauthorized, wrong email or password';
                if (!user || !user.isPassword(user.get('password'), password)) {
                    throw new Error(errorMessage);
                }
                const payload = { sub: user.get('id') };
                return {
                    token: jwt.sign(payload, utils_1.JWT_SECRET)
                };
            });
        },
        createUser: (parent, { input }, { db }, info) => {
            return db.sequelize.transaction((t) => {
                return db.User.create(input, {
                    transaction: t
                });
            }).catch(utils_1.handleError);
        },
        updateUser: composable_resolver_1.compose(...auth_resolver_1.authResolvers)((parent, { input }, { db, authUser }, info) => {
            return db.sequelize.transaction((t) => {
                return db.User
                    .findById(authUser.id)
                    .then((user) => {
                    utils_1.throwError(!user, `User with id ${authUser.id} not found`);
                    return user.update(input, {
                        transaction: t
                    });
                });
            }).catch(utils_1.handleError);
        }),
        updateUserPassword: composable_resolver_1.compose(...auth_resolver_1.authResolvers)((parent, { input }, { db, authUser }, info) => {
            return db.sequelize.transaction((t) => {
                return db.User
                    .findById(authUser.id)
                    .then((user) => {
                    utils_1.throwError(!user, `User with id ${authUser.id} not found`);
                    return user.update(input, {
                        transaction: t
                    }).then((user) => !!user);
                });
            }).catch(utils_1.handleError);
        }),
        deleteUser: composable_resolver_1.compose(...auth_resolver_1.authResolvers)((parent, args, { db, authUser }, info) => {
            return db.sequelize.transaction((t) => {
                return db.User
                    .findById(authUser.id)
                    .then((user) => {
                    utils_1.throwError(!user, `User with id ${authUser.id} not found`);
                    return user.destroy({ transaction: t })
                        .then(user => true)
                        .catch(error => {
                        // poderia fazer alguma manipulação do erro aqui
                        return false;
                    });
                });
            }).catch(utils_1.handleError);
        })
    }
};
const SchemaDefinition = `
    type Schema {
        query: Query
        mutation: Mutation
    }
`;
exports.default = graphql_tools_1.makeExecutableSchema({
    typeDefs: [
        SchemaDefinition,
        query_1.Query,
        mutation_1.Mutation,
        comment_schema_1.commentTypes,
        post_schema_1.postTypes,
        token_schema_1.tokenTypes,
        user_schema_1.userTypes
    ],
    resolvers
});
