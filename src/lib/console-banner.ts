const repository = 'https://github.com/thomazzi98/thomazzi98.github.io';

export const announceInConsole = (): void => {
  console.info(
    '%cRafael Thomazzi · the backend between systems',
    'font-weight: 600',
    `
How this is made: /colophon/
Source: ${repository}`,
  );
};
