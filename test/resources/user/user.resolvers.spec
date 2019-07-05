import * as jwt from 'jsonwebtoken';
import {db, chai, app, handleError, expect} from '../../teste-utils';
import { UserInstance } from '../../../src/models/UserModel';
import { JWT_SECRET } from '../../../src/utils/utils';

describe('User', () => {

    let token: string;
    let userId: number;

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
                            
                        }).catch(handleError);

                });

            });


            describe('deleteUser', () => {

                it('Should delete a existing User', () => {
                    
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


})
