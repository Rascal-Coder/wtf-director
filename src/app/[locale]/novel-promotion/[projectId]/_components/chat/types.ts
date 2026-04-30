export type ChatRole = "user" | "assistant";

export interface ChatAskOption {
  id: string;
  label: string;
}

export type ChatMsg =
  | {
      id: string;
      role: ChatRole;
      kind: "text";
      text: string;
      pending?: boolean;
      tone?: "default" | "progress" | "error";
    }
  | {
      id: string;
      role: "assistant";
      kind: "ask";
      prompt: string;
      options: ChatAskOption[];
      pickedId?: string;
    };
