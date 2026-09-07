const repository = 'https://github.com/thomazzi98/thomazzi98.github.io';

export const announceInConsole = (): void => {
  console.info(
    '%cRafael Thomazzi · the backend between systems',
    'font-weight: 600',
    `
How this is made: /colophon/
Source: ${repository}
Every bench is a deterministic simulation. Its seed is printed when it boots; append ?seed=<number> to replay a run.`,
  );
};
