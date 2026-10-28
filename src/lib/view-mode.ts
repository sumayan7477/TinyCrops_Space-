export type ViewMode = "farmer" | "inspector";
export const modeKey = (userId: string) => `tc_view_mode:${userId}`;
export const parseMode = (value: string | null): ViewMode => value === "inspector" ? "inspector" : "farmer";