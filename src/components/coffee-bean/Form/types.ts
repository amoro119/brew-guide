// 类型定义已统一到 @/types/app，从那里导入
import type { CoffeeBean, BlendComponent } from '@/types/app';

// 重新导出类型
export type { CoffeeBean, BlendComponent };

// ExtendedCoffeeBean 已移除，直接使用 CoffeeBean
export type ExtendedCoffeeBean = CoffeeBean;
