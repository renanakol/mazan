# רישום משימה יומית בתזמון המשימות של Windows: סנכרון כל יום בשעה 07:30,
# ואם המחשב היה כבוי בשעה הזו, הסנכרון ירוץ כשהוא יידלק.
# להסרה:  Unregister-ScheduledTask -TaskName "Mazan Sync" -Confirm:$false
param([string]$At = '07:30')
$cmd = Join-Path $PSScriptRoot 'run-sync.cmd'
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$cmd`""
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -RunOnlyIfNetworkAvailable
Register-ScheduledTask -TaskName 'Mazan Sync' -Action $action -Trigger $trigger -Settings $settings -Description 'Mazan: daily read-only sync of bank and credit card transactions' -Force | Out-Null
Write-Host "The daily sync is scheduled for $At (task name: Mazan Sync)."
