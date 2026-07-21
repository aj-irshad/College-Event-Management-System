import bcrypt from "bcrypt";

const saltRounds = 10;

async function createHashPassword(password) {
  return await bcrypt.hash(password, saltRounds);
}

async function compareHashPassword(password, hashPassword) {
  return await bcrypt.compare(password, hashPassword);
}

export { createHashPassword, compareHashPassword };
