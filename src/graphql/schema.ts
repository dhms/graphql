import * as jwt from 'jsonwebtoken';
import {makeExecutableSchema} from 'graphql-tools';
import { Query } from './query';
import { Mutation } from './mutation';

import { commentTypes } from './resources/comment/comment.schema';
import { postTypes } from './resources/post/post.schema';
import { userTypes } from './resources/user/user.schema';

import { DbConnection } from '../interfaces/DbConnectionInterface';
import { GraphQLResolveInfo } from 'graphql';
import { handleError, JWT_SECRET, throwError } from '../utils/utils';
import { UserInstance } from '../models/UserModel';
import { Transaction } from 'sequelize';
import { PostInstance } from '../models/PostModel';
import { CommentInstance } from '../models/CommentModel';
import { tokenTypes } from './resources/token/token.schema';
import { compose } from './composable/composable.resolver';
import { authResolvers } from './composable/auth.resolver';
import { AuthUser } from '../interfaces/AuthUserInterface';
import { DataLoaders } from '../interfaces/DataLoadersInterface';
import { ResolverContext } from '../interfaces/ResolverContextInterface';

const resolvers = {

    Comment : {

        user: (comment, {id}, {db, dataloaders: {userLoader}}: {db: DbConnection, dataloaders: DataLoaders}, info: GraphQLResolveInfo) => {
            return userLoader
                .load({key: comment.get('user'), info})
                .catch(handleError);
        },

        post: (comment, {id},  {db, dataloaders: {postLoader}}: {db: DbConnection, dataloaders: DataLoaders}, info: GraphQLResolveInfo) => {
            return postLoader
                .load({key: comment.get('post'), info})
                .catch(handleError);
        }
    },

    Post : {

        author: (post, args, {db, dataloaders: {userLoader}}: {db: DbConnection, dataloaders: DataLoaders}, info: GraphQLResolveInfo) => {
            return userLoader
                .load({key: post.get('author'), info})
                .catch(handleError);
        },

        comments: (post, {first = 10, offset = 0}, context: ResolverContext, info: GraphQLResolveInfo) => {
            return context.db.Comment
                .findAll({
                    where:{post: post.get('id')},
                    limit: first,
                    offset: offset,
                    attributes: context.requestedFields.getFields(info)
                }).catch(handleError);
        }
    },

    User : {
        posts: (user, {first = 10, offset = 0}, context: ResolverContext, info: GraphQLResolveInfo) => {
            return context.db.Post
                .findAll({
                    where:{author: user.get('id')},
                    limit: first,
                    offset: offset,
                    attributes: context.requestedFields.getFields(info, {keep: ['id'], exclude: ['comments']})
                }).catch(handleError);
        }
    },

    Query: {
        
        commentsByPost: (parent, {id, first = 10, offset = 0}, context: ResolverContext, info: GraphQLResolveInfo) => {
            return context.db.Comment
                .findAll({
                    where: {post: id},
                    limit: first,
                    offset: offset,
                    attributes: context.requestedFields.getFields(info)
                }).catch(handleError);
        },

        posts: (parent, {first = 10, offset = 0}, context: ResolverContext, info: GraphQLResolveInfo) => {
            return context.db.Post
                .findAll({
                    limit: first,
                    offset: offset,
                    attributes: context.requestedFields.getFields(info, {keep: ['id'], exclude: ['comments']})
                }).catch(handleError);
        },

        post: (parent, {id}, context: ResolverContext, info: GraphQLResolveInfo) => {
            id = parseInt(id);
            return context.db.Post
                .findById(id, {
                    attributes: context.requestedFields.getFields(info, {keep: ['id'], exclude: ['comments']})
                })
                .then((post: PostInstance) => {
                    if(!post) 
                        throw new Error(`Post with id ${id} not found`);
                    return post;
                }).catch(handleError);
        },


        users: (parent, {first = 10, offset = 0}, context: ResolverContext, info: GraphQLResolveInfo) => {
            return context.db.User
                .findAll({
                    limit: first,
                    offset: offset,
                    attributes: context.requestedFields.getFields(info, {keep: ['id'], exclude: ['posts']})
                }).catch(handleError);
        },

        user: (parent, {id}, context: ResolverContext, info: GraphQLResolveInfo) => {
            id = parseInt(id);
            return context.db.User
                .findById(id, {
                    attributes: context.requestedFields.getFields(info, {keep: ['id'], exclude: ['posts']})
                })
                .then((user: UserInstance) => {
                    throwError(!user, `User with id ${id} not found`);
                    return user;
                }).catch(handleError);
        },

        currentUser: compose(...authResolvers)((parent, args, context: ResolverContext, info: GraphQLResolveInfo) => {
            return context.db.User
                .findById(context.authUser.id, {
                    attributes: context.requestedFields.getFields(info, {keep: ['id'], exclude: ['posts']})
                })
                .then((user: UserInstance) => {
                    throwError(!user, `User with id ${context.authUser.id} not found`);
                    return user; 
                }).catch(handleError);
        })
    }, 

    Mutation : {

        createComment: compose(...authResolvers)((parent, {input}, {db, authUser}: {db: DbConnection, authUser: AuthUser}, info: GraphQLResolveInfo) => {
            input.user = authUser.id;
            return db.sequelize.transaction((t: Transaction) => {
                return db.Comment.create(input, {
                    transaction: t
                })
            }).catch(handleError);
        }),

        updateComment: compose(...authResolvers)((parent, {id, input}, {db, authUser}: {db: DbConnection, authUser: AuthUser}, info: GraphQLResolveInfo) => {
            id = parseInt(id);
            return db.sequelize.transaction((t: Transaction) => {
                return db.Comment
                    .findById(id)
                    .then((comment: CommentInstance) => {
                        throwError(!comment, `Comment with id ${id} not found`);
                        throwError(comment.get('user') != authUser.id, 'Unauthorized! You can only edit comments by yourself');
                        input.user = authUser.id;
                        return comment.update(input, {
                            transaction: t
                        }); 
                    });
            }).catch(handleError);
        }),

        deleteComment: compose(...authResolvers)((parent, {id}, {db, authUser}: {db: DbConnection, authUser: AuthUser}, info: GraphQLResolveInfo) => {
            id = parseInt(id);
            return db.sequelize.transaction((t: Transaction) => {
                return db.Comment
                    .findById(id)
                    .then((comment: CommentInstance) => {
                        throwError(!comment, `Comment with id ${id} not found`);
                        throwError(comment.get('user') != authUser.id, 'Unauthorized! You can only edit comments by yourself');
                        
                        return comment.destroy({transaction: t})
                            .then(comment => true)
                            .catch(error => {
                                // poderia fazer alguma manipulação do erro aqui
                                return false;
                            }); 
                    });
            }).catch(handleError);
        }),

        createPost: compose(...authResolvers)((parent, {input}, {db, authUser}: {db: DbConnection, authUser: AuthUser}, info: GraphQLResolveInfo) => {
            input.author = authUser.id;
            return db.sequelize.transaction((t: Transaction) => {
                return db.Post.create(input, {
                    transaction: t
                })
            }).catch(handleError);
        }),

        updatePost: compose(...authResolvers)((parent, {id, input}, {db, authUser}: {db: DbConnection, authUser: AuthUser}, info: GraphQLResolveInfo) => {
            id = parseInt(id);
            return db.sequelize.transaction((t: Transaction) => {
                return db.Post
                    .findById(id)
                    .then((post: PostInstance) => {
                        throwError(!post, `Post with id ${id} not found`);
                        throwError(post.get('author') != authUser.id, 'Unauthorized! You can only edit posts by yourself');
                        input.author = authUser.id;
                        return post.update(input, {
                            transaction: t
                        }); 
                    });
            }).catch(handleError);
        }),

        deletePost: compose(...authResolvers)((parent, {id}, {db, authUser}: {db: DbConnection, authUser: AuthUser}, info: GraphQLResolveInfo) => {
            id = parseInt(id);
            return db.sequelize.transaction((t: Transaction) => {
                return db.Post
                    .findById(id)
                    .then((post: PostInstance) => {
                        throwError(!post, `Post with id ${id} not found`);
                        throwError(post.get('author') != authUser.id, 'Unauthorized! You can only delete posts by yourself');
                        
                        return post.destroy({transaction: t})
                            .then(post => true)
                            .catch(error => {
                                // poderia fazer alguma manipulação do erro aqui
                                return false;
                            }); 
                    });
            }).catch(handleError);
        }),

        createToken: (parent, {email, password}, {db}: {db: DbConnection}) => {
            return db.User.findOne({
                where: {email: email},
                attributes: ['id', 'password']
            }).then((user: UserInstance) => {
                let errorMessage: string = 'Unauthorized, wrong email or password';
                if(!user || !user.isPassword(user.get('password'), password)){
                    throw new Error(errorMessage);
                }
                
                const payload = {sub: user.get('id')}
                
                return {
                    token: jwt.sign(payload, JWT_SECRET)
                }
            })
        },

        createUser: (parent, {input}, {db}: {db: DbConnection}, info: GraphQLResolveInfo) => {
            return db.sequelize.transaction((t: Transaction) => {
                return db.User.create(input, {
                    transaction: t
                })
            }).catch(handleError);
        },

        updateUser: compose(...authResolvers)((parent, {input}, {db, authUser}: {db: DbConnection, authUser: AuthUser}, info: GraphQLResolveInfo) => {
    
            return db.sequelize.transaction((t: Transaction) => {
                return db.User
                    .findById(authUser.id)
                    .then((user: UserInstance) => {
                        throwError(!user, `User with id ${authUser.id} not found`);
                        return user.update(input, {
                            transaction: t
                        }); 
                    });
            }).catch(handleError);
        }),

        updateUserPassword: compose(...authResolvers)((parent, {input}, {db, authUser}: {db: DbConnection, authUser:AuthUser}, info: GraphQLResolveInfo) => {
            
            return db.sequelize.transaction((t: Transaction) => {
                return db.User
                    .findById(authUser.id)
                    .then((user: UserInstance) => {
                        throwError(!user, `User with id ${authUser.id} not found`);
                        return user.update(input, {
                            transaction: t
                        }).then((user: UserInstance) => !!user); 
                    });
            }).catch(handleError);
        }),

        deleteUser: compose(...authResolvers)((parent, args, {db, authUser}: {db: DbConnection, authUser: AuthUser}, info: GraphQLResolveInfo) => {
            
            return db.sequelize.transaction((t: Transaction) => {
                return db.User
                    .findById(authUser.id)
                    .then((user: UserInstance) => {
                        throwError(!user, `User with id ${authUser.id} not found`);
                        return user.destroy({transaction: t})
                            .then(user => true)
                            .catch(error => {
                                // poderia fazer alguma manipulação do erro aqui
                                return false;
                            }); 
                    });
            }).catch(handleError);
        })
    }
}

const SchemaDefinition = `
    type Schema {
        query: Query
        mutation: Mutation
    }
`;

export default makeExecutableSchema({
    
    typeDefs: [
        SchemaDefinition,
        Query,
        Mutation,
        commentTypes,
        postTypes,
        tokenTypes,
        userTypes
    ],
    resolvers
});