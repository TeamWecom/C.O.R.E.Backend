const generateNumber = (max) => {
    let number = '';
    for (let index = 0; index < max; index++) {
        number = `${number}${faker.random.number(9)}`;
    }
    return number;
};

const minOne = (max) => {
    const number = faker.random.number(max);
    return number > 0 ? number : 1;
};

// // CREATE USER
// factory.define('Usuario', Usuario, {
//     ...
// });

// // CREATE CLIENT
// factory.define('Cliente', Cliente, {
//     ...
// });

// // CREATE PARTY
// factory.define('Party', Party, {
//     ...
// });

// // CREATE LOCAL
// factory.define('Local', Local, {
//     ...
// });