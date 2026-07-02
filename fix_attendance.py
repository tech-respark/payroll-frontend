import re

path = r"D:\Respark\Respark_backend\payroll-frontend-v2\src\screens\AttendanceDashboard.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Add import
content = content.replace("import styles from './AttendanceDashboard.module.scss';", "import styles from './AttendanceDashboard.module.scss';\nimport { Badge } from '../components/ui';")

# The status variants mapping
#   case 'P': return '#10b981'; // Green -> badge-success
#   case 'A': return '#ef4444'; // Red -> badge-danger
#   case 'HD': return '#f59e0b'; // Orange -> badge-warning
#   case 'L': return '#3b82f6'; // Blue -> badge-primary (wait, we don't have primary, let's use default or add it, we'll just use inline style for now or add primary badge)
# Wait, let's add a quick helper to map status to badge variant
helper = """
const getBadgeVariant = (status) => {
  switch(status) {
    case 'P': return 'success';
    case 'A': return 'danger';
    case 'HD': return 'warning';
    case 'L': return 'default';
    case 'WO': return 'default';
    case 'PH': return 'default';
    default: return 'default';
  }
};
"""
content = content.replace("const getStatusLabel = (status) => {", helper + "\nconst getStatusLabel = (status) => {")

# Replace calendar status cell
content = re.sub(
    r'<div className=\{styles\.calendarStatus\} style=\{\{ color: getStatusColor\(cell\.status\) \}\}>\s*\{cell\.status\}\s*</div>',
    r'<div className={styles.calendarStatus}>\n                  <Badge variant={getBadgeVariant(cell.status)}>{cell.status}</Badge>\n                </div>',
    content
)

# Replace legend items
# <span className={styles.legendItem} style={{ color: getStatusColor('P') }}>P - Present</span>
def legend_repl(m):
    status = m.group(1)
    text = m.group(2)
    return f'<Badge variant={{getBadgeVariant(\'{status}\')}}>{text}</Badge>'

content = re.sub(
    r'<span className=\{styles\.legendItem\} style=\{\{ color: getStatusColor\(\'([A-Z]+)\'\) \}\}>([^<]+)</span>',
    legend_repl,
    content
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("AttendanceDashboard fixed")
