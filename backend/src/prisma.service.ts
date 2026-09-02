import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { PrismaClient } from '../../generated-prisma';
import { resolve } from 'path';
const PrismaClientRuntime=require(resolve(process.cwd(),'../generated-prisma/index.js')).PrismaClient as typeof PrismaClient;
@Injectable() export class PrismaService extends PrismaClientRuntime implements OnModuleDestroy { async onModuleDestroy(){await this.$disconnect();} }
