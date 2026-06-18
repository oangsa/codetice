import json

transcript_path = "/Users/martin/.gemini/antigravity/brain/afc3ed52-c7d6-4a52-b852-ef6989d0b06f/.system_generated/logs/transcript.jsonl"
target_file = "/Users/martin/project/codetice/components/classrooms/question-table.tsx"

with open(transcript_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total log lines: {len(lines)}")

# Let's search for any VIEW_FILE step that is large (e.g. contains "Total Lines: 483" or has the full text)
for i in range(len(lines) - 1, -1, -1):
    try:
        step = json.loads(lines[i])
    except Exception:
        continue
        
    if step.get("type") == "VIEW_FILE" and step.get("status") == "DONE":
        content = step.get("content", "")
        if "question-table.tsx" in content and "Total Lines: 483" in content:
            print(f"Found FULL VIEW_FILE at step {step.get('step_index')}")
            with open("/Users/martin/project/codetice/scratch/restored_question_table.tsx", "w", encoding="utf-8") as out:
                out.write(content)
            print("Saved full content to scratch/restored_question_table.tsx")
            break
            
    # Also look at tools
    tool_calls = step.get("tool_calls", [])
    for tc in tool_calls:
        if tc.get("name") == "view_file":
            args = tc.get("args", {})
            if args.get("AbsolutePath", "").endswith("question-table.tsx") and "StartLine" not in args:
                # This was a full read! Let's find the corresponding response step
                print(f"Found full view_file call at step {step.get('step_index')}")
                # The response is typically at step_index + 1
                for j in range(i + 1, min(i + 10, len(lines))):
                    try:
                        resp = json.loads(lines[j])
                    except Exception:
                        continue
                    if resp.get("type") == "VIEW_FILE" and resp.get("status") == "DONE":
                        resp_content = resp.get("content", "")
                        print(f"Found response at step {resp.get('step_index')}")
                        with open("/Users/martin/project/codetice/scratch/restored_question_table.tsx", "w", encoding="utf-8") as out:
                            out.write(resp_content)
                        print("Saved to scratch/restored_question_table.tsx")
                        break
