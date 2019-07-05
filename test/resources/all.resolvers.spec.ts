import * as jwt from 'jsonwebtoken';
import {db, chai, app, handleError, expect} from '../teste-utils';
import { UserInstance } from '../../src/models/UserModel';
import { JWT_SECRET } from '../../src/utils/utils';
import { PostInstance } from '../../src/models/PostModel';
import { CommentInstance } from '../../src/models/CommentModel';

describe('All', () => {

    let token: string;
    let userId: number;
    let postId: number;
    let commentId: number; 

    before(() => {
        return db.Comment.destroy({where: {}})
            .then((rows: number) => db.Post.destroy({where: {}}))
            .then((rows: number) => db.User.destroy({where: {}}))
            .then((rows: number) => db.User.bulkCreate([
                {
                    name: "Testador Um",
                    email: "testador1@spec.com",
                    password: "1234"
                },
                {
                    name: "Testador Dois",
                    email: "testador2@spec.com",
                    password: "1234"
                },

                {
                    name: "Testador Tres",
                    email: "testador3@spec.com",
                    password: "1234"
                }
            ])).then((users: UserInstance[]) => {
                userId = users[0].get('id');
                const payload = {sub: userId};
                token = jwt.sign(payload, JWT_SECRET);

                return db.Post.bulkCreate([
                    {
                        title: "First Post",
                        content: "First Post",
                        author: userId,
                        photo: "First_Post"
                    },
                    {
                        title: "Second Post",
                        content: "Second Post",
                        author: userId,
                        photo: "Second_Post"
                    },
                    {
                        title: "Third Post",
                        content: "Third Post",
                        author: userId,
                        photo: "ThirdPost"
                    }
                ]).then((posts: PostInstance[]) => {
                    postId = posts[0].get('id');

                    return db.Comment.bulkCreate([
                        {
                            comment: "Comment One",
                            user: userId,
                            post: postId
                        },
                        {
                            comment: "Comment Two",
                            user: userId,
                            post: postId
                        },
                        {
                            comment: "Comment Three",
                            user: userId,
                            post: postId
                        }        
                    ]).then((comments: CommentInstance[]) => {
                        commentId = comments[0].get('id');
                    })
                });

            });
    })

    beforeEach(() => {
        return db.Post.findAll()
            .then((posts: PostInstance[]) => {
                postId = posts[0].get('id');

                return db.Comment.findAll()
                    .then((comments: CommentInstance[]) => {
                        commentId = comments[0].get('id');

                        return db.User.findAll()
                            .then((users: UserInstance[]) => {
                                userId = users[0].get('id');

                                const payload = {sub: userId};
                                token = jwt.sign(payload, JWT_SECRET);

                            })
                    })
                });
            })

    describe('Queries', () => {

        describe('application/json', () => {

            describe('users', () => {

                it('Should return a list of Users', () => {

                    let body = {
                        query: `
                            query{
                                users{
                                    name
                                    email
                                }
                            }
                        `
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {

                            const usersList = res.body.data.users;
                            expect(res.body.data).to.be.an('object');
                            expect(usersList[0]).to.not.have.keys(['id', 'photo', 'posts']);
                            expect(usersList[0]).to.have.keys(['name', 'email']);
                        }).catch(handleError);
                });

                it('Should paginate a list of Users', () => {

                    let body = {
                        query: `
                            query getUserList($first: Int, $offset: Int){
                                users(first: $first, offset: $offset){
                                    name
                                    email
                                    createdAt
                                }
                            }
                        `,
                        variables: {
                            first: 2,
                            offset: 1
                        }
                    };
    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
    
                            const usersList = res.body.data.users;
                            expect(res.body.data).to.be.an('object');
                            expect(usersList).to.be.an('array').of.length(2);
                            expect(usersList[0]).to.not.have.keys(['id', 'photo', 'posts']);
                            expect(usersList[0]).to.have.keys(['name', 'email', 'createdAt']);
                        }).catch(handleError);
                }); 


            });
            
            describe('user', () => {


                it('Should return a single User', () => {

                    let body = {
                        query: `
                            query getSingleUser($id: ID!){
                                user(id: $id){
                                    name
                                    email
                                    posts{
                                        title
                                    }
                                }
                            }
                        `,
                        variables: {
                            id: userId
                        }
                    };
    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
    
                            const singleUser = res.body.data.user;
                            expect(res.body.data).to.be.an('object');
                            expect(singleUser).to.be.an('object');                                                        
                            expect(singleUser).to.have.keys(['name', 'email', 'posts']);
                            expect(singleUser.email).to.equal('testador1@spec.com');

                        }).catch(handleError);
                }); 

                it('Should return an error if User not exists', () => {

                    let body = {
                        query: `
                            query getSingleUser($id: ID!){
                                user(id: $id){
                                    name
                                    email                                  
                                }
                            }
                        `,
                        variables: {
                            id: -1
                        }
                    };
    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {

                            expect(res.body.user).to.be.undefined;
                            expect(res.body.errors).to.be.an('array');
                            expect(res.body).to.have.keys(['data', 'errors']);
                            
                        }).catch(handleError);
                });

                it('Should return only \'name\' attribute', () => {

                    let body = {
                        query: `
                            query getSingleUser($id: ID!){
                                user(id: $id){
                                    name                                   
                                }
                            }
                        `,
                        variables: {
                            id: userId
                        }
                    };
    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
    
                            const singleUser = res.body.data.user;
                            expect(res.body.data).to.be.an('object');
                            expect(singleUser).to.be.an('object');                                                        
                            expect(singleUser).to.have.key('name');
                            expect(singleUser.email).to.be.undefined;
                            
                        }).catch(handleError);
                });


            })
        })
    });

    describe('Queries', () => {

        describe('application/json', () => {

            describe('posts', () => {

                it('Should return a list of Posts', () => {

                    let body = {
                        query: `
                            query{
                                posts{
                                    content
                                    photo
                                }
                            }
                        `
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {

                            const postsList = res.body.data.posts;
                            expect(res.body.data).to.be.an('object');
                            expect(postsList[0]).to.not.have.keys(['id', 'comments']);
                            expect(postsList[0]).to.have.keys(['content', 'photo']);
                        }).catch(handleError);
                });

                it('Should paginate a list of Posts', () => {

                    let body = {
                        query: `
                            query getPostList($first: Int, $offset: Int){
                                posts(first: $first, offset: $offset){
                                    content
                                    photo
                                }
                            }
                        `,
                        variables: {
                            first: 2,
                            offset: 1
                        }
                    };
    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
    
                            const postList = res.body.data.posts;
                            expect(res.body.data).to.be.an('object');
                            expect(postList).to.be.an('array').of.length(2);
                            expect(postList[0]).to.not.have.keys(['id', 'comments']);
                            expect(postList[0]).to.have.keys(['content', 'photo']);
                        }).catch(handleError);
                }); 


            });
            
            describe('post', () => {


                it('Should return a single Post', () => {

                    let body = {
                        query: `
                            query getSinglePost($id: ID!){
                                post(id: $id){
                                    title
                                    author{
                                        name
                                        email
                                    }
                                    comments{
                                        comment
                                    }
                                }
                            }
                        `,
                        variables: {
                            id: postId
                        }
                    };
    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {
    
                            const singlePost = res.body.data.post;
                            expect(res.body.data).to.be.an('object');
                            expect(singlePost).to.be.an('object');                                                        
                            expect(singlePost).to.have.keys(['title', 'author', 'comments']);
                            expect(singlePost.title).to.equal('First Post');                            
                            expect(singlePost.author).to.be.an('object').with.keys(['name', 'email']); 

                        }).catch(handleError);
                }); 

            })
        })
    });

    describe('Queries', () => {

        describe('application/json', () => {

            describe('comments', () => {

                it('Should return a list of Comments', () => {

                    let body = {
                        query: `
                            query commentsByPost($id: ID!, $first: Int, $offset: Int){
                                commentsByPost(id:  $id, first: $first, offset: $offset){
                                    comment
                                    user{
                                        name
                                    }
                                }
                            }
                        `,
                        variables: {
                            id: postId,
                            first: 2,
                            offset: 1
                        }
                    };

                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {

                            const commentsByPost = res.body.data.commentsByPost;
                            expect(res.body.data).to.be.an('object');
                            expect(res.body.data.commentsByPost).to.be.an('array');
                            expect(commentsByPost[0]).to.not.have.keys(['id']);
                            expect(commentsByPost[0]).to.have.keys(['comment', 'user']);
                        }).catch(handleError);
                });

            });
        });
    });
    
    describe('Mutations', () => {

        describe('application/json', () => {

            describe('createUser', () => {

                it('Should create new User', () => {
                    
                    let body = {
                        query: `
                            mutation createNewUser($input: UserCreateInput!){
                                createUser(input: $input){
                                    id
                                    name
                                    email                                  
                                }
                            }
                        `,
                        variables: {
                            input: {
                                name: "Testador Quatro",
                                email: "testador4@spec.com",
                                password: "1234"
                            }
                        }
                    };
                    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .send(JSON.stringify(body))
                        .then(res => {

                            const createdUser = res.body.data.createUser;
                            expect(createdUser).to.be.an('object');                                                        
                            expect(createdUser).to.have.keys(['id', 'name', 'email']);
                            expect(createdUser.email).to.equal('testador4@spec.com');
                            expect(parseInt(createdUser.id)).to.be.an('number');
                            
                        }).catch(handleError);

                });

            });


            describe('updateUser', () => {

                it('Should update a existing User', () => {
                    
                    let body = {
                        query: `
                            mutation updateExistingUser($input: UserUpdateInput!){
                                updateUser(input: $input){                                
                                    name
                                    email                    
                                    photo              
                                }
                            }
                        `,
                        variables: {
                            input: {
                                name: "Primeiro Testador",
                                email: "testador1@spec.com",
                                photo: "photo.jpg"
                            }
                        }
                    };
                    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {

                            const updatedUser = res.body.data.updateUser;
                            expect(updatedUser).to.be.an('object');                                                        
                            expect(updatedUser).to.have.keys(['name', 'email', 'photo']);
                            expect(updatedUser.name).to.equal('Primeiro Testador');
                            expect(updatedUser.email).to.equal('testador1@spec.com');
                            expect(parseInt(updatedUser.photo)).to.not.be.null;
                            expect(parseInt(updatedUser.id)).to.be.NaN;
                            
                        }).catch(handleError);

                });

                it('Should block operation if token is invalid', () => {
                    
                    let body = {
                        query: `
                            mutation updateExistingUser($input: UserUpdateInput!){
                                updateUser(input: $input){                                
                                    name
                                    email                    
                                    photo              
                                }
                            }
                        `,
                        variables: {
                            input: {
                                name: "Primeiro Testador",
                                email: "testador1@spec.com",
                                photo: "photo.jpg"
                            }
                        }
                    };
                    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', 'Bearer INVALID_TOKEN')
                        .send(JSON.stringify(body))
                        .then(res => {

                            expect(res.body.data.updateUser).to.be.null;
                            expect(res.body.errors).to.be.an('array');
                            expect(res.body).to.have.keys(['data', 'errors']);
                            
                        }).catch(handleError);

                });

            });


            describe('updateUserPassword', () => {

                it('Should update the password of an existing User', () => {
                    
                    let body = {
                        query: `
                            mutation updateUserPassword($input: UserUpdatePasswordInput!){
                                updateUserPassword(input: $input)
                            }
                        `,
                        variables: {
                            input: {
                                password: "testador1234"
                            }
                        }
                    };
                    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {
                            
                            expect(res.body.data.updateUserPassword).to.be.true;

                            body = {
                                query: `
                                    mutation updateUserPassword($input: UserUpdatePasswordInput!){
                                        updateUserPassword(input: $input)
                                    }
                                `,
                                variables: {
                                    input: {
                                        password: "1234"
                                    }
                                }
                            };

                            return chai.request(app)
                                .post('/graphql')
                                .set('content-type', 'application/json')
                                .set('authorization', `Bearer ${token}`)
                                .send(JSON.stringify(body))
                                .then(res => {
                                    
                                    expect(res.body.data.updateUserPassword).to.be.true;
                                    
                                }).catch(handleError);
                            
                        }).catch(handleError);

                });

            });

            describe('createPost', () => {

                it('Should create new Post', () => {
                    
                    let body = {
                        query: `
                            mutation createNewPost($input: PostInput!){
                                createPost(input: $input){
                                    id
                                    title
                                    content
                                    photo
                                }
                            }
                        `,
                        variables: {
                            input: {
                                title: "Post Test",
                                content: "Post Test",
                                photo: "post_test"
                            }
                        }
                    };
                    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {

                            const createdPost = res.body.data.createPost;
                            expect(createdPost).to.be.an('object');                                                        
                            expect(createdPost).to.have.keys(['id','title', 'content', 'photo']);
                            expect(parseInt(createdPost.id)).to.be.an('number');
                            
                        }).catch(handleError);

                });

            });


            describe('updatePost', () => {

                it('Should update a existing Post', () => {
                    
                    let body = {
                        query: `
                            mutation updateExistingPost($id: ID!, $input: PostInput!){
                                updatePost(id: $id, input: $input){                                
                                    title
                                    content
                                    photo
                                }
                            }
                        `,
                        variables: {
                            id: postId,

                            input: {
                                title: "Post Updated",
                                content: "Post Updated",
                                photo: "post_updated"
                            }
                        }
                    };
                    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {

                            const updatedPost = res.body.data.updatePost;
                            expect(updatedPost).to.be.an('object');                                                        
                            expect(updatedPost).to.have.keys(['title', 'content', 'photo']);
                            expect(updatedPost.title).to.equal('Post Updated');
                            
                        }).catch(handleError);

                });

            });

            describe('createComment', () => {

                it('Should create new Comment', () => {
                    
                    let body = {
                        query: `
                            mutation createNewComment($input: CommentInput!){
                                createComment(input: $input){
                                    id
                                    comment                                    
                                    user{
                                        name
                                    }
                                    post{
                                        content
                                    }
                                }
                            }
                        `,
                        variables: {
                            input: {
                                comment: "Comment Test",                                
                                post: postId
                            }
                        }
                    };
                    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {

                            const createdComment = res.body.data.createComment;
                            expect(createdComment).to.be.an('object');                                                        
                            expect(createdComment).to.have.keys(['id','comment','user','post']);
                            expect(parseInt(createdComment.id)).to.be.an('number');
                            
                        }).catch(handleError);

                });

            });


            describe('updateComment', () => {

                it('Should update a existing Comment', () => {
                    
                    let body = {
                        query: `
                            mutation updateExistingComment($id: ID!, $input: CommentInput!){
                                updateComment(id: $id, input: $input){                                
                                    comment
                                }
                            }
                        `,
                        variables: {
                            id: commentId,

                            input: {
                                comment: "Comment Updated",
                                post: postId
                            }
                        }
                    };
                    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {

                            const updatedComment = res.body.data.updateComment;
                            expect(updatedComment).to.be.an('object');                                                        
                            expect(updatedComment).to.have.keys(['comment']);
                            expect(updatedComment.comment).to.equal('Comment Updated');
                            
                        }).catch(handleError);

                });

            });

            describe('deleteComment', () => {

                it('Should delete a existing Comment', () => {
                    
                    let body = {
                        query: `
                            mutation deleteComment($id: ID!){
                                deleteComment(id: $id)
                            }
                        `,
                        variables: {
                            id: 2
                        }

                    };
                    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {                            
                            expect(res.body.data.deleteComment).to.be.true;
                            
                        }).catch(handleError);

                });

            });

            describe('deletePost', () => {

                it('Should delete a existing Post', () => {
                    
                    let body = {
                        query: `
                            mutation deletePost($id: ID!){
                                deletePost(id: $id)
                            }
                        `,
                        variables: {
                            id: postId
                        }

                    };
                    
                    return chai.request(app)
                        .post('/graphql')
                        .set('content-type', 'application/json')
                        .set('authorization', `Bearer ${token}`)
                        .send(JSON.stringify(body))
                        .then(res => {
                            
                            expect(res.body.data.deletePost).to.be.true;
                            
                        }).catch(handleError);

                });

            });

            describe('deleteUser', () => {

                it('Should delete a existing User', () => {
                    
                    db.User.findById(userId).then((data: any) => {
                        userId = data.get('id');
                        const payload = {sub: userId};
                        token = jwt.sign(payload, JWT_SECRET);          

                        let body = {
                            query: `
                                mutation {
                                    deleteUser
                                }
                            `
                        };
                        
                        return chai.request(app)
                            .post('/graphql')
                            .set('content-type', 'application/json')
                            .set('authorization', `Bearer ${token}`)
                            .send(JSON.stringify(body))
                            .then(res => {
                                
                                expect(res.body.data.deleteUser).to.be.true;
                                
                            }).catch(handleError);
                    });                    
                });
            });
        });
    });
});
