using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
internal static class Launcher {
  [STAThread]
  private static void Main() {
    string root=AppDomain.CurrentDomain.BaseDirectory;
    string exe=Path.Combine(root,"runtime","electron","electron.exe");
    if(!File.Exists(exe)){MessageBox.Show("Не найден runtime Electron. Сохраните структуру папки Mediaprompter.","Mediaprompter");return;}
    try { Process.Start(new ProcessStartInfo(exe,"\""+root.TrimEnd(Path.DirectorySeparatorChar)+"\""){WorkingDirectory=root,UseShellExecute=false,WindowStyle=ProcessWindowStyle.Normal}); }
    catch(Exception e){MessageBox.Show("Не удалось запустить программу: "+e.Message,"Mediaprompter");}
  }
}