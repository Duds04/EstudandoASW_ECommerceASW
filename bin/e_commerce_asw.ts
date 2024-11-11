#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { ECommerceApiStack } from '../lib/ecommerceApi-stack';

// Representa o back-end de um Ecommerce ficticio
// Ponto de entrada da aplicação (Primeira coisa a ser executada)

const app = new cdk.App();

// Criando instancias das Stacks desenvolvidas
/* Stacks podem ter dependencias
    stack da API depende da stack de produtos (pois a API recebe como parametro a função de produtos) 
      logo ela é desenvolvida depois

  Todos os recursos eu preciso passar a região e a conta de deployment (criar uma constante env, ambiente, para passar essas informações)
*/

const env: cdk.Environment = {
  account: "207567781813",
  region: "us-east-1"
}

// Colocando tags que identificam o recurso criado (pra fazer controle de custo)
  // Centro de curso é o projeto ECommerce
const tags = {
  cost: "ECommerce",
  team: "Maria Eduarda",
  developer: "Maria Eduarda"
}

/* variavem que instancia a stack da função de retornar produtos
  inserida dentro do escopo app
  definindo propriedades da stack (tags e ambiente)
*/
const productsAppStack = new ProductsAppStack(app, 'ProductsAppStack', {
  tags: tags,
  env: env,
})

// Passa a Stack como parametro pelo props
const eCommerceApiStack = new ECommerceApiStack(app, 'ECommerceApiStack', {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  tags: tags,
  env: env,
})

// Deixando explicito que a stack da API depende da stack de produtos
eCommerceApiStack.addDependency(productsAppStack)
