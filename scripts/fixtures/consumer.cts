import React = require('react');
import selector = require('react-cmp-selector');
const child = React.createElement('h1', { 'data-slot': 'header' }, 'Hello');
const single: React.ReactElement | null = selector.getCmpByAttr({
  children: child,
  value: 'header',
});
const all: React.ReactElement[] = selector.getCmpByAttr({
  children: child,
  value: 'header',
  findAll: true,
});
const slot: React.ReactElement = React.createElement(selector.Slot, {
  name: 'header',
  children: child,
});
void [single, all, slot];
