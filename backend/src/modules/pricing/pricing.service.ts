import { Injectable } from '@nestjs/common';
import { CalculateDto } from '../quotes/dto/quotes.dto';
import { calculatePricing } from './pricing-calculation';

@Injectable()
export class PricingService {
  calculate(input:CalculateDto){
    return calculatePricing(input);
  }
}
