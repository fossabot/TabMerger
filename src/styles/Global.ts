import { createGlobalStyle, css } from "styled-components";

/* stylelint-disable block-opening-brace-newline-after */
export const GlobalStyle = createGlobalStyle`${css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  * {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
  }

  html,
  body {
    height: 100%;
  }

  body {
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  p,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    overflow-wrap: break-word;
  }

  input,
  button,
  textarea,
  select {
    font: inherit;
  }

  #root {
    isolation: isolate;
  }
`}
`;
