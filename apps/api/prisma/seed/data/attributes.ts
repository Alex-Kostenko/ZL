import { slugify } from '../../../src/common/text/slugify';
import type { AttributeType } from '../../../src/generated/prisma/client';

type Names = { uk: string; ru: string; en: string };

export interface AttributeSeed {
  code: string;
  type: AttributeType;
  name: Names;
  unit?: Names;
  isFilterable?: boolean;
  isSearchable?: boolean;
  isVariantOption?: boolean;
  /** SELECT / MULTI_SELECT options: code → labels. */
  options?: { code: string; label: Names }[];
  /** Categories (by uk names from the root) where the attribute is available; inherited below. */
  categories: string[][];
}

const same = (label: string): Names => ({ uk: label, ru: label, en: label });
const MM: Names = { uk: 'мм', ru: 'мм', en: 'mm' };
const M: Names = { uk: 'м', ru: 'м', en: 'm' };

/** Base characteristics for the seeded tree; the full set is managed in the admin (step 10.4). */
export const ATTRIBUTES: AttributeSeed[] = [
  {
    code: 'caliber',
    type: 'SELECT',
    name: { uk: 'Калібр', ru: 'Калибр', en: 'Caliber' },
    isFilterable: true,
    isSearchable: true,
    isVariantOption: true,
    options: [
      '12/70',
      '12/76',
      '16/70',
      '20/70',
      '.22 LR',
      '.223 Rem',
      '.308 Win',
      '.30-06 Sprg',
      '7.62x39',
      '5.45x39',
      '9x19',
      '4.5 мм',
      '5.5 мм',
    ].map((c) => ({ code: slugify(c), label: same(c) })),
    categories: [
      ['Зброя', 'Вогнепальна зброя'],
      ['Зброя', 'Пневматична зброя'],
      ['Зброя', 'Патрони'],
    ],
  },
  {
    code: 'action_type',
    type: 'SELECT',
    name: { uk: 'Тип механізму', ru: 'Тип механизма', en: 'Action type' },
    isFilterable: true,
    options: [
      { code: 'pump', label: { uk: 'Помповий', ru: 'Помповый', en: 'Pump-action' } },
      { code: 'semi-auto', label: { uk: 'Напівавтомат', ru: 'Полуавтомат', en: 'Semi-automatic' } },
      {
        code: 'bolt',
        label: {
          uk: 'Поздовжньо-ковзний затвор',
          ru: 'Продольно-скользящий затвор',
          en: 'Bolt-action',
        },
      },
      { code: 'break', label: { uk: 'Переломний', ru: 'Переломный', en: 'Break-action' } },
    ],
    categories: [['Зброя', 'Вогнепальна зброя']],
  },
  {
    code: 'barrel_length',
    type: 'NUMBER',
    name: { uk: 'Довжина ствола', ru: 'Длина ствола', en: 'Barrel length' },
    unit: MM,
    isFilterable: true,
    categories: [
      ['Зброя', 'Вогнепальна зброя'],
      ['Зброя', 'Пневматична зброя'],
    ],
  },
  {
    code: 'magnification',
    type: 'RANGE',
    name: { uk: 'Кратність', ru: 'Кратность', en: 'Magnification' },
    unit: same('×'),
    isFilterable: true,
    categories: [
      ['Оптика', 'Приціли'],
      ['Оптика', 'Денна спостережна оптика'],
    ],
  },
  {
    code: 'objective_diameter',
    type: 'NUMBER',
    name: { uk: "Діаметр об'єктива", ru: 'Диаметр объектива', en: 'Objective diameter' },
    unit: MM,
    isFilterable: true,
    categories: [
      ['Оптика', 'Приціли'],
      ['Оптика', 'Денна спостережна оптика'],
    ],
  },
  {
    code: 'reticle_illumination',
    type: 'BOOLEAN',
    name: { uk: 'Підсвічування сітки', ru: 'Подсветка сетки', en: 'Illuminated reticle' },
    isFilterable: true,
    categories: [['Оптика', 'Приціли']],
  },
  {
    code: 'thermal_resolution',
    type: 'SELECT',
    name: { uk: 'Роздільна здатність сенсора', ru: 'Разрешение сенсора', en: 'Sensor resolution' },
    isFilterable: true,
    options: ['256x192', '384x288', '640x512', '1024x768'].map((c) => ({
      code: c,
      label: same(c),
    })),
    categories: [['Оптика', 'Спеціальна оптика']],
  },
  {
    code: 'detection_range',
    type: 'NUMBER',
    name: { uk: 'Дальність виявлення', ru: 'Дальность обнаружения', en: 'Detection range' },
    unit: M,
    isFilterable: true,
    categories: [['Оптика', 'Спеціальна оптика']],
  },
  {
    code: 'blade_length',
    type: 'NUMBER',
    name: { uk: 'Довжина клинка', ru: 'Длина клинка', en: 'Blade length' },
    unit: MM,
    isFilterable: true,
    categories: [
      ['Ножі та ліхтарі', 'Ножі та комплектуючі'],
      ['Зброя', 'Холодна зброя та інструменти'],
    ],
  },
  {
    code: 'blade_steel',
    type: 'SELECT',
    name: { uk: 'Сталь клинка', ru: 'Сталь клинка', en: 'Blade steel' },
    isFilterable: true,
    isSearchable: true,
    options: [
      {
        code: 'stainless',
        label: { uk: 'Нержавіюча сталь', ru: 'Нержавеющая сталь', en: 'Stainless steel' },
      },
      {
        code: 'carbon',
        label: { uk: 'Вуглецева сталь', ru: 'Углеродистая сталь', en: 'Carbon steel' },
      },
      {
        code: 'damascus',
        label: { uk: 'Дамаська сталь', ru: 'Дамасская сталь', en: 'Damascus steel' },
      },
      {
        code: 'powder',
        label: { uk: 'Порошкова сталь', ru: 'Порошковая сталь', en: 'Powder steel' },
      },
    ],
    categories: [
      ['Ножі та ліхтарі', 'Ножі та комплектуючі'],
      ['Зброя', 'Холодна зброя та інструменти'],
    ],
  },
  {
    code: 'luminous_flux',
    type: 'NUMBER',
    name: { uk: 'Світловий потік', ru: 'Световой поток', en: 'Luminous flux' },
    unit: { uk: 'лм', ru: 'лм', en: 'lm' },
    isFilterable: true,
    categories: [['Ножі та ліхтарі', 'Ліхтарі']],
  },
  {
    code: 'battery_type',
    type: 'MULTI_SELECT',
    name: { uk: 'Тип елементів живлення', ru: 'Тип элементов питания', en: 'Battery type' },
    isFilterable: true,
    options: ['18650', '21700', 'CR123A', 'AA', 'AAA'].map((c) => ({
      code: c.toLowerCase(),
      label: same(c),
    })),
    categories: [
      ['Ножі та ліхтарі', 'Ліхтарі'],
      ['Оптика', 'Спеціальна оптика'],
    ],
  },
  {
    code: 'water_resistance',
    type: 'SELECT',
    name: { uk: 'Вологозахист', ru: 'Влагозащита', en: 'Water resistance' },
    isFilterable: true,
    options: ['IPX4', 'IPX6', 'IPX7', 'IPX8', 'IP67', 'IP68'].map((c) => ({
      code: c.toLowerCase(),
      label: same(c),
    })),
    categories: [['Ножі та ліхтарі', 'Ліхтарі'], ['Оптика']],
  },
];
