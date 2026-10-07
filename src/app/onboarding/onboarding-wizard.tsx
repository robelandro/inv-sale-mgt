"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { completeOnboardingAction } from "@/app/actions/onboarding.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Building2,
  UserCheck,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Loader2,
  ShieldAlert,
} from "lucide-react";

const CURRENCIES = [
  { code: "USD", name: "US Dollar ($)" },
  { code: "EUR", name: "Euro (€)" },
  { code: "GBP", name: "British Pound (£)" },
  { code: "CAD", name: "Canadian Dollar ($)" },
  { code: "AUD", name: "Australian Dollar ($)" },
  { code: "ETB", name: "Ethiopian Birr (Br)" },
  { code: "KES", name: "Kenyan Shilling (KSh)" },
  { code: "NGN", name: "Nigerian Naira (₦)" },
  { code: "ZAR", name: "South African Rand (R)" },
  { code: "INR", name: "Indian Rupee (₹)" },
  { code: "AED", name: "UAE Dirham (AED)" },
  { code: "SAR", name: "Saudi Riyal (SAR)" },
];

const ACCENT_COLORS = [
  { name: "indigo", bg: "bg-indigo-600" },
  { name: "blue", bg: "bg-blue-600" },
  { name: "emerald", bg: "bg-emerald-600" },
  { name: "violet", bg: "bg-violet-600" },
  { name: "rose", bg: "bg-rose-600" },
  { name: "amber", bg: "bg-amber-600" },
];

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500" };
  if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (score === 3) return { score: 3, label: "Good", color: "bg-blue-500" };
  return { score: 4, label: "Strong", color: "bg-emerald-500" };
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);

  // Form State
  const [companyName, setCompanyName] = React.useState("");
  const [currency, setCurrency] = React.useState("USD");
  const [invoicePrefix, setInvoicePrefix] = React.useState("INV");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [uploadingLogo, setUploadingLogo] = React.useState(false);

  // Admin Account
  const [adminName, setAdminName] = React.useState("");
  const [adminEmail, setAdminEmail] = React.useState("");
  const [adminPassword, setAdminPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // Preferences
  const [allowNegativeStock, setAllowNegativeStock] = React.useState(false);
  const [lowStockDefault, setLowStockDefault] = React.useState(5);
  const [allowCredit, setAllowCredit] = React.useState(true);
  const [taxEnabled, setTaxEnabled] = React.useState(false);
  const [taxRate, setTaxRate] = React.useState(0);
  const [accentColor, setAccentColor] = React.useState("indigo");

  const pwdStrength = getPasswordStrength(adminPassword);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size cannot exceed 2 MB");
      return;
    }

    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setLogoUrl(data.url);
      toast.success("Logo uploaded successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!companyName.trim()) {
        toast.error("Company name is required");
        return false;
      }
      if (!currency) {
        toast.error("Please select a currency");
        return false;
      }
      return true;
    }
    if (s === 2) {
      if (!adminName.trim()) {
        toast.error("Admin name is required");
        return false;
      }
      if (!adminEmail.trim() || !adminEmail.includes("@")) {
        toast.error("Valid admin email is required");
        return false;
      }
      if (adminPassword.length < 8) {
        toast.error("Password must be at least 8 characters");
        return false;
      }
      if (adminPassword !== confirmPassword) {
        toast.error("Passwords do not match");
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(4, prev + 1));
    }
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await completeOnboardingAction({
        companyName,
        currency,
        invoicePrefix,
        phone,
        email,
        address,
        logoUrl,
        adminName,
        adminEmail,
        adminPassword,
        confirmPassword,
        allowNegativeStock,
        lowStockDefault,
        allowCredit,
        taxEnabled,
        taxRate,
        accentColor,
      });

      if (!res.success) {
        toast.error(res.error || "Setup failed");
        setLoading(false);
        return;
      }

      toast.success("Setup complete! Welcome to your dashboard.");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  const stepsHeader = [
    { num: 1, label: "Company", icon: Building2 },
    { num: 2, label: "Owner", icon: UserCheck },
    { num: 3, label: "Rules", icon: Sliders },
    { num: 4, label: "Review", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-8">
      {/* Step Indicator */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {stepsHeader.map((s) => {
            const Icon = s.icon;
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "border-2 border-primary text-primary bg-primary/10 shadow"
                      : "border text-muted-foreground bg-muted/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-xs mt-1.5 font-medium ${
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="absolute top-5 left-8 right-8 -z-10 h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Company Info */}
      {step === 1 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Company Details</h2>
            <p className="text-sm text-muted-foreground">
              Configure your primary company identity and invoicing currency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="cName">Company Name *</Label>
              <Input
                id="cName"
                placeholder="e.g. Acme Supplies Ltd"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prefix">Invoice Prefix</Label>
              <Input
                id="prefix"
                placeholder="INV"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cPhone">Phone Number (Optional)</Label>
              <Input
                id="cPhone"
                placeholder="+1 555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cEmail">Company Email (Optional)</Label>
              <Input
                id="cEmail"
                type="email"
                placeholder="contact@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="cAddress">Address (Optional)</Label>
              <Input
                id="cAddress"
                placeholder="123 Commerce Way, City"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* Logo Upload */}
            <div className="sm:col-span-2 space-y-2 border-t pt-3">
              <Label>Company Logo (Optional, max 2 MB)</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative h-16 w-16 border rounded-lg p-1 bg-white flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-16 border border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                    <Upload className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingLogo}
                    onClick={() => document.getElementById("logo-upload")?.click()}
                  >
                    {uploadingLogo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {logoUrl ? "Replace Logo" : "Upload Logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG or WebP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Owner Account */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl font-bold tracking-tight">System Owner Account</h2>
            <p className="text-sm text-muted-foreground">
              This account will have permanent Owner permissions to manage users, settings, and full financials.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aName">Full Name *</Label>
              <Input
                id="aName"
                placeholder="Jane Doe"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aEmail">Email Address *</Label>
              <Input
                id="aEmail"
                type="email"
                placeholder="owner@company.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aPass">Password * (min 8 characters)</Label>
              <Input
                id="aPass"
                type="password"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              {adminPassword && (
                <div className="space-y-1 pt-1">
                  <div className="flex h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full ${pwdStrength.color}`}
                      style={{ width: `${(pwdStrength.score / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Strength: {pwdStrength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cPass">Confirm Password *</Label>
              <Input
                id="cPass"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Business Rules & Preferences */}
      {step === 3 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Business Rules & Preferences</h2>
            <p className="text-sm text-muted-foreground">
              Control stock integrity safeguards, credit terms, and sales tax.
            </p>
          </div>

          <div className="space-y-4 divide-y">
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5 pr-4">
                <Label className="text-sm font-semibold">Allow Selling with Insufficient Stock</Label>
                <p className="text-xs text-muted-foreground">
                  Default: No. When disabled, sales that exceed available stock are strictly rejected.
                </p>
              </div>
              <Switch
                checked={allowNegativeStock}
                onCheckedChange={setAllowNegativeStock}
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5 pr-4">
                <Label className="text-sm font-semibold">Allow Credit (Debt) Sales</Label>
                <p className="text-xs text-muted-foreground">
                  Default: Yes. Allows sales on credit or partial payment to verified customers.
                </p>
              </div>
              <Switch
                checked={allowCredit}
                onCheckedChange={setAllowCredit}
              />
            </div>

            <div className="pt-3 space-y-2">
              <Label htmlFor="lowStock">Default Low-Stock Alert Threshold</Label>
              <Input
                id="lowStock"
                type="number"
                min={0}
                value={lowStockDefault}
                onChange={(e) => setLowStockDefault(parseInt(e.target.value) || 0)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Products falling below this quantity will display amber alert badges.
              </p>
            </div>

            <div className="pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">Sales Tax</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable automatic tax calculation on sales invoices.
                  </p>
                </div>
                <Switch
                  checked={taxEnabled}
                  onCheckedChange={setTaxEnabled}
                />
              </div>

              {taxEnabled && (
                <div className="space-y-1.5 pl-2 border-l-2 border-primary">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-32"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 space-y-2">
              <Label>Theme Accent Color</Label>
              <div className="flex items-center gap-3 pt-1">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setAccentColor(c.name)}
                    className={`h-7 w-7 rounded-full ${c.bg} transition-all ${
                      accentColor === c.name
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "opacity-80 hover:opacity-100"
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Review and Finish */}
      {step === 4 && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Review & Finish Setup</h2>
            <p className="text-sm text-muted-foreground">
              Please review your settings. Initial catalog defaults (pcs, kg, box, litre, meter) and the Walk-in Customer record will be initialized automatically in one transaction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl text-sm">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider block">
                Company
              </span>
              <p className="font-semibold text-base">{companyName}</p>
              <p className="text-muted-foreground">Currency: {currency}</p>
              <p className="text-muted-foreground">Prefix: {invoicePrefix}</p>
            </div>

            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider block">
                Owner Account
              </span>
              <p className="font-semibold text-base">{adminName}</p>
              <p className="text-muted-foreground">{adminEmail}</p>
              <span className="inline-block mt-1 text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded">
                Role: Owner
              </span>
            </div>

            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider block">
                Stock Policy
              </span>
              <p className="font-medium">
                Negative Stock: {allowNegativeStock ? "Allowed" : "Strictly Forbidden"}
              </p>
              <p className="text-muted-foreground">
                Low stock threshold: {lowStockDefault} units
              </p>
            </div>

            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider block">
                Credit & Tax
              </span>
              <p className="font-medium">
                Credit sales: {allowCredit ? "Enabled" : "Disabled"}
              </p>
              <p className="text-muted-foreground">
                Tax: {taxEnabled ? `${taxRate}% enabled` : "Disabled"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t pt-4">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <Button type="button" onClick={handleNext}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm & Launch System
          </Button>
        )}
      </div>
    </div>
  );
}
