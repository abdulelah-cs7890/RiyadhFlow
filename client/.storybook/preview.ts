import type { Preview } from '@storybook/react'
import { createElement } from 'react'
import '../app/globals.css'
import { IntlDecorator } from './IntlDecorator'

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    // Wrap every story in next-intl's provider so components that call
    // useTranslations() render their localized strings instead of raw keys.
    (Story) => createElement(IntlDecorator, null, createElement(Story)),
  ],
};

export default preview;
