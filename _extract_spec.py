from pathlib import Path
import re

p = Path(r"C:\Users\Nguyen Nhat Tam\Downloads\demo-project (1).html")
if not p.exists():
    p = Path(r"C:\Users\Nguyen Nhat Tam\Downloads\demo-project.html")
text = p.read_text(encoding="utf-8", errors="ignore")
text2 = re.sub(r"data:image/[^\"']+", "[IMG]", text)
# drop style
text2 = re.sub(r"<style[\s\S]*?</style>", "", text2, flags=re.I)
text2 = re.sub(r"<script[\s\S]*?</script>", "\n", text2, flags=re.I)
# keep pre/code and tags as text-ish
plain = re.sub(r"<[^>]+>", "\n", text2)
plain = re.sub(r"\n{3,}", "\n\n", plain)
out = Path(r"C:\Users\Nguyen Nhat Tam\Downloads\PROFES\Ky4_FPT\PRJ301\PRJ_Sm\_spec.txt")
out.write_text(plain, encoding="utf-8")
print("wrote", out, "chars", len(plain))
