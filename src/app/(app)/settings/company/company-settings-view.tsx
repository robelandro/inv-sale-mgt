"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateCompanyAction } from "@/app/actions/company.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Upload, Loader2, Save } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export function CompanySettingsView({ initialCompany }: { initialCompany: any }) {
  const router = useRouter();
  const { t } = useTranslation();

  const [name, setName] = React.useState(initialCompany?.name || "");
  const [currency, setCurrency] = React.useState(initialCompany?.currency || "USD");
  const [invoicePrefix, setInvoicePrefix] = React.useState(
    initialCompany?.invoicePrefix || "INV"
  );
  const [phone, setPhone] = React.useState(initialCompany?.phone || "");
  const [email, setEmail] = React.useState(initialCompany?.email || "");
  const [address, setAddress] = React.useState(initialCompany?.address || "");
  const [logoUrl, setLogoUrl] = React.useState(initialCompany?.logoUrl || "");
  const [allowNegativeStock, setAllowNegativeStock] = React.useState(
    initialCompany?.allowNegativeStock ?? false
  );
  const [lowStockDefault, setLowStockDefault] = React.useState(
    initialCompany?.lowStockDefault?.toString() || "5"
  );
  const [allowCredit, setAllowCredit] = React.useState(
    initialCompany?.allowCredit ?? true
  );
  const [taxEnabled, setTaxEnabled] = React.useState(
    initialCompany?.taxEnabled ?? false
  );
  const [taxRate, setTaxRate] = React.useState(
    initialCompany?.taxRate?.toString() || "0"
  );
  const [accentColor, setAccentColor] = React.useState(
    initialCompany?.accentColor || "indigo"
  );

  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type || !file.type.startsWith("image/")) {
      toast.error(t.settings.invalidImageType || "Please select an image file (PNG, JPG, WebP, SVG)");
      return;
    }

    if (file.size > 400 * 1024) {
      toast.error(t.settings.logoSizeLimit || "Image size must not exceed 400 KB");
      return;
    }

    setIsUploading(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setLogoUrl(data.url);
      toast.success(t.settings.logoSuccess);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t.settings.companyNameRequired);
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateCompanyAction({
        name,
        currency,
        invoicePrefix,
        phone,
        email,
        address,
        logoUrl,
        allowNegativeStock,
        lowStockDefault: parseInt(lowStockDefault) || 5,
        allowCredit,
        taxEnabled,
        taxRate: parseFloat(taxRate) || 0,
        accentColor,
      });

      if (!res.success) {
        toast.error(res.error || "Update failed");
        setIsSaving(false);
        return;
      }

      toast.success(t.settings.savedSuccess);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.settings.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t.settings.subtitle}
          </p>
        </div>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {t.settings.saveSettings}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Identity */}
        <Card className="rounded-card border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t.settings.companyProfile}</CardTitle>
            <CardDescription className="text-xs">
              {t.settings.companyProfileDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sName">{t.settings.companyName} *</Label>
              <Input
                id="sName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sCurr">{t.settings.currencyCode} *</Label>
                <Input
                  id="sCurr"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sPref">{t.settings.invoicePrefix} *</Label>
                <Input
                  id="sPref"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sPhone">{t.settings.phoneNumber}</Label>
                <Input
                  id="sPhone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sEmail">{t.settings.emailAddress}</Label>
                <Input
                  id="sEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sAddr">{t.settings.streetAddress}</Label>
              <Input
                id="sAddr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* Logo */}
            <div className="space-y-2 border-t pt-3">
              <Label>{t.settings.logo}</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-12 w-12 rounded object-contain border p-1 bg-white"
                  />
                ) : (
                  <div className="h-12 w-12 rounded border border-dashed flex items-center justify-center text-muted-foreground text-xs">
                    {t.settings.noLogo}
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    id="set-logo"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => document.getElementById("set-logo")?.click()}
                  >
                    {isUploading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    {logoUrl ? t.settings.replaceLogo : t.settings.uploadLogo}
                  </Button>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {t.settings.logoMaxNote || "Max 400 KB, image only"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Rules */}
        <Card className="rounded-card border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t.settings.rulesAndTax}</CardTitle>
            <CardDescription className="text-xs">
              {t.settings.rulesAndTaxDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <Label className="text-sm font-semibold">{t.settings.allowNegativeStock}</Label>
                <p className="text-xs text-muted-foreground">
                  {t.settings.allowNegativeStockDesc}
                </p>
              </div>
              <Switch
                checked={allowNegativeStock}
                onCheckedChange={setAllowNegativeStock}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5 pr-4">
                <Label className="text-sm font-semibold">{t.settings.allowCredit}</Label>
                <p className="text-xs text-muted-foreground">
                  {t.settings.allowCreditDesc}
                </p>
              </div>
              <Switch
                checked={allowCredit}
                onCheckedChange={setAllowCredit}
              />
            </div>

            <div className="border-t pt-4 space-y-1.5">
              <Label htmlFor="sLow">{t.settings.lowStockThreshold}</Label>
              <Input
                id="sLow"
                type="number"
                min={0}
                value={lowStockDefault}
                onChange={(e) => setLowStockDefault(e.target.value)}
                className="w-32"
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold">{t.settings.enableSalesTax}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t.settings.enableSalesTaxDesc}
                  </p>
                </div>
                <Switch
                  checked={taxEnabled}
                  onCheckedChange={setTaxEnabled}
                />
              </div>

              {taxEnabled && (
                <div className="space-y-1.5 pl-2 border-l-2 border-primary">
                  <Label htmlFor="sTax">{t.settings.defaultTaxRate}</Label>
                  <Input
                    id="sTax"
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-32"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
