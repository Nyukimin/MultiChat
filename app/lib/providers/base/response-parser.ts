export interface ResponseParser {
  parse(chunk: string): string;
  handleError(error: Error, chunk: string): string;
}
