import re

path = r"D:\Respark\Respark_backend\payroll-frontend-v2\src\screens\StaffDashboard.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'<button type="button" className=\{styles\.cancelBtn\}(.*?)>\s*Cancel\s*</button>',
    r'<Button type="button" variant="outline"\1>\n                  Cancel\n                </Button>',
    content, flags=re.DOTALL
)

content = re.sub(
    r'<button type="submit" className=\{styles\.saveBtn\}(.*?)>\s*\{isSaving \? \'Saving\.\.\.\' : \'Save Profile\'\}\s*</button>',
    r'<Button type="submit" variant="primary"\1>\n                  {isSaving ? \'Saving...\' : \'Save Profile\'}\n                </Button>',
    content, flags=re.DOTALL
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("StaffDashboard fixed")
