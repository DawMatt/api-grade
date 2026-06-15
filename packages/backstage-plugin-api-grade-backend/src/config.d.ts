export interface Config {
  apiGrade?: {
    ruleset?: {
      /** @visibility secret */
      url?: string;
      /** @visibility secret */
      token?: string;
    };
    visibility?: {
      allowAll?: boolean;
      groups?: string[];
    };
  };
}
