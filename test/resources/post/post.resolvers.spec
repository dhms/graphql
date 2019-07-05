import * as jwt from 'jsonwebtoken';
import {db, chai, app, handleError, expect} from '../../teste-utils';
import { UserInstance } from '../../../src/models/UserModel';
import { JWT_SECRET } from '../../../src/utils/utils';
import { PostInstance } from '../../../src/models/PostModel';

describe('Post', () => {

    let token: string;
    let userId: number;
    let postId: number;

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
                });
            });
    })

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
    
    describe('Mutations', () => {

        describe('application/json', () => {

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

        });
    });
})
