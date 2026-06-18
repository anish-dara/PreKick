declare namespace JSX {
  interface IntrinsicElements {
    "elevenlabs-convai": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      "signed-url"?: string;
      "dynamic-variables"?: string;
    };
  }
}
