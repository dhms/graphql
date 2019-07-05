import * as jwt from 'jsonwebtoken';
import {db, chai, app, handleError, expect} from '../../teste-utils';
import { UserInstance } from '../../../src/models/UserModel';
import { JWT_SECRET } from '../../../src/utils/utils';
import { PostInstance } from '../../../src/models/PostModel';
import { CommentInstance } from '../../../src/models/CommentModel';

describe('Comment', () => {

    let token: string;
    let userId: number;
    let postId: number;
    let commentId: number;    

    before(() => {
        return db.Comment.destroy({where: {}})
            .then((rows: number) => db.Post.destroy({where: {}}))
            .then((rows: number) => db.User.destroy({where: {}}))
            .then((rows: number) => db.User.create(
                {
                    name: "Testador Um",
                    email: "testador1@spec.com",
                    password: "1234"
                }
            )).then((user: UserInstance) => {
                userId = user.get('id');
                const payload = {sub: userId};
                token = jwt.sign(payload, JWT_SECRET);

                return db.Post.create(
                    {
                        title: "First Post",
                        content: "First Post",
                        author: userId,
                        photo: "First_Post"
                    
                    }
                ).then((post: PostInstance) => {
                    postId = post.get('id');

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
                                user: userId,
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
                                comment: "Comment Updated"
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
                            id: commentId
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

        });
    });
})
