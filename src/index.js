const express = require("express");
const { v4 } = require("uuid");

const app = express();
app.use(express.json());

const customers = [];

// Middleware
function verifyIfExistsAccountCPF(req, res, next) {
  const { cpf } = req.headers;

  const customer = customers.find(account => account.cpf === cpf);

  if(!customer) {
    return res.status(400).json({
      type: "error", 
      message: "Não foi encontrado uma conta com este cpf"
    });
  };

  req.customer = customer;

  return next();
};

// Balance
function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if(operation.type === "credit") {
      return acc + operation.amount;
    } else {
      return acc - operation.amount
    }
  }, 0);

  return balance;
};

// Acounts
app.get("/getAccounts", (req, res) => {
  return res.status(201).json(customers);
});

// UnicAcount
app.post("/createAccount", (req, res) => {
  const { cpf, name } = req.body;

  const cpfAlreadyExists = customers.some(customer => customer.cpf === cpf);
  if(cpfAlreadyExists) return res.status(400).json({ message: "Cpf já existente", type: "error"});

  customers.push({
    cpf,
    name,
    id: v4(),
    statement: []
  })

  return res.status(201).json({
    message: "Cadastrado com sucesso",
    type: "success"
  });
});

app.put("/updateAccount", verifyIfExistsAccountCPF, (req, res) => {
  const { name } = req.body;
  const { customer } = req;

  customer.name = name;

  return res.status(201).send();
});

app.delete("/deleteAccount", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;

  customers.splice(customer, 1);

  return res.status(201).send();
});

app.get("/getBalanceUnicAccount", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;

  const balance = getBalance(customer.statement);

  return res.status(201).json(balance);
});

// Statement
app.get("/statement", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  return res.json(customer.statement);
});

app.get("/statement/date", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  const { date } = req.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter((statement) => {
    return statement.create_at.toDateString() === dateFormat.toDateString()
  });

  return res.status(201).json(statement);
});

app.post("/deposit", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  const { description, amount } = req.body;

  const statementOperation = {
    description,
    amount,
    create_at: new Date(),
    type: "credit"
  };

  customer.statement.push(statementOperation);

  return res.status(201).send();
});

app.post("/withdraw", verifyIfExistsAccountCPF, (req, res) => {
  const { amount } = req.body;
  const { customer } = req;

  const balance = getBalance(customer.statement);
  if(balance < amount ) {
    return res.status(400).json({
      message: "O valor em conta não é o suficiente", 
      type: "erro"
    });
  };

  const statementOperation = {
    amount,
    create_at: new Date(),
    type: "debito"
  };

  customer.statement.push(statementOperation);

  return res.status(201).send()
});

app.listen(3333);