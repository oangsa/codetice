import { describe, expect, test } from "bun:test";

import { formatSubmissionFeedback, formatSubmissionStatusLabel } from "./feedback";

describe("formatSubmissionStatusLabel", () => {
  test("accepted returns 'Accepted'", () => {
    expect(formatSubmissionStatusLabel("accepted")).toBe("Accepted");
  });

  test("wrong_answer returns 'Not correct'", () => {
    expect(formatSubmissionStatusLabel("wrong_answer")).toBe("Not correct");
  });

  test("runtime_error returns 'Runtime error'", () => {
    expect(formatSubmissionStatusLabel("runtime_error")).toBe("Runtime error");
  });

  test("time_limit_exceeded returns 'Time limit exceeded'", () => {
    expect(formatSubmissionStatusLabel("time_limit_exceeded")).toBe("Time limit exceeded");
  });

  test("memory_limit_exceeded returns 'Memory limit exceeded'", () => {
    expect(formatSubmissionStatusLabel("memory_limit_exceeded")).toBe("Memory limit exceeded");
  });

  test("internal_error returns 'System error'", () => {
    expect(formatSubmissionStatusLabel("internal_error")).toBe("System error");
  });

  test("queued returns 'Queued'", () => {
    expect(formatSubmissionStatusLabel("queued")).toBe("Queued");
  });

  test("running returns 'Processing'", () => {
    expect(formatSubmissionStatusLabel("running")).toBe("Processing");
  });

  test("unknown status is humanized", () => {
    expect(formatSubmissionStatusLabel("some_custom_status")).toBe("some custom status");
  });
});

describe("formatSubmissionFeedback", () => {
  test("accepted includes pass count and score", () => {
    const result = formatSubmissionFeedback("accepted", 5, 10, "50.00");
    expect(result).toContain("Accepted");
    expect(result).toContain("5/10");
    expect(result).toContain("50.00");
  });

  test("queued returns queue message", () => {
    expect(formatSubmissionFeedback("queued")).toBe("Submission recorded and queued for grading.");
  });

  test("running returns processing message", () => {
    expect(formatSubmissionFeedback("running")).toBe("Submission is being graded.");
  });

  test("error status includes pass count and score", () => {
    const result = formatSubmissionFeedback("wrong_answer", 3, 5, "60.00");
    expect(result).toContain("Not correct");
    expect(result).toContain("3/5");
    expect(result).toContain("60.00");
  });

  test("handles missing optional params", () => {
    const result = formatSubmissionFeedback("runtime_error");
    expect(result).toContain("Runtime error");
    expect(result).toContain("0/0");
    expect(result).toContain("0");
  });
});
