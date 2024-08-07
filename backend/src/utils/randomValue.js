export function generateRandomBigInt(length) {
    let randomBigInt = '';
    for (let i = 0; i < length; i++) {
        randomBigInt += Math.floor(Math.random() * 10);
    }
    return BigInt(randomBigInt);
}
