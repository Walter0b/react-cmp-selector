import { createElement, type ReactElement } from 'react';
import { getCmpByAttr, Slot, SlotUtils } from 'react-cmp-selector';
const child = createElement('h1', { 'data-slot': 'header' }, 'Hello');
const single: ReactElement | null = getCmpByAttr({
  children: child,
  value: 'header',
});
const all: ReactElement[] = getCmpByAttr({
  children: child,
  value: 'header',
  findAll: true,
});
const slot: ReactElement = createElement(Slot, {
  name: 'header',
  children: child,
});
const missing: string[] = SlotUtils.validate(child, ['header']);
void [single, all, slot, missing];
