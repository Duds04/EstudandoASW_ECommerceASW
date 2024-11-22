#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { ECommerceApiStack } from '../lib/ecommerceApi-stack';
import { ProductsAppLayerStack } from '../lib/productsAppLayers-stack';

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

/**
 * Antes de criar as demais stack da API (usam a stack layer), é necessário criar a stack de produtos
 * tags --> tags que identificam o recurso criado (pra fazer controle de custo)
 * env --> ambiente de deployment (região e conta a ser utilizados)
 * 
 * Não tem dependencias diretas entre a stack layer e as stacks de produtos,
 *    isso porque assim podemos fazer alterações na stack layer sem precisar alterar as stacks de produtos (sem afetar as funções lambdas)
 * 
 */
const productsAppLayerStack = new ProductsAppLayerStack(app,'ProductsAppLayerStack', {
  tags: tags,
  env: env,
})


/* variavem que instancia a stack da função de retornar produtos
inserida dentro do escopo app
  definindo propriedades da stack (tags e ambiente)
*/
const productsAppStack = new ProductsAppStack(app, 'ProductsAppStack', {
  tags: tags,
  env: env,
})

// Definir que a stack de layer seja executada antes das demais stacks
  // Stack de produtos depende indiretamente da stack de layer, dependencia fraca
productsAppStack.addDependency(productsAppLayerStack)

// Passa a Stack como parametro pelo props
const eCommerceApiStack = new ECommerceApiStack(app, 'ECommerceApiStack', {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  tags: tags,
  env: env,
})

// Deixando explicito que a stack da API depende da stack de produtos
eCommerceApiStack.addDependency(productsAppStack)

