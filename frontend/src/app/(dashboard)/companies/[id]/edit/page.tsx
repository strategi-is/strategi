'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { companyApi } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  websiteUrl: z.string().url('Must be a valid URL'),
  industry: z.string().min(1, 'Required'),
  targetAudience: z.string().min(10, 'Please be more descriptive (min 10 chars)'),
  productsServices: z.string().min(10, 'Please be more descriptive (min 10 chars)'),
  keyDifferentiators: z.string().min(10, 'Please be more descriptive (min 10 chars)'),
  brandVoiceNotes: z.string().optional(),
  competitors: z
    .array(z.object({ name: z.string().optional(), websiteUrl: z.string().url('Must be a valid URL') }))
    .max(5),
});
type FormData = z.infer<typeof schema>;

export default function EditCompanyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const { data: companyRes, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => companyApi.getOne(id),
  });

  const company = companyRes?.data?.data;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { competitors: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'competitors' });

  // Populate form once company data loads
  useEffect(() => {
    if (company) {
      reset({
        name: company.name,
        websiteUrl: company.websiteUrl,
        industry: company.industry,
        targetAudience: company.targetAudience,
        productsServices: company.productsServices,
        keyDifferentiators: company.keyDifferentiators,
        brandVoiceNotes: company.brandVoiceNotes ?? '',
        competitors: (company.competitors ?? []).map(
          (c: { name?: string; websiteUrl: string }) => ({
            name: c.name ?? '',
            websiteUrl: c.websiteUrl,
          }),
        ),
      });
    }
  }, [company, reset]);

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      await companyApi.update(id, data);
      router.push(`/companies/${id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to save changes';
      setServerError(msg);
    }
  }

  if (isLoading) return <div className="text-sm text-gray-500">Loading...</div>;
  if (!company) return <div className="text-sm text-red-500">Company not found</div>;

  return (
    <div className="space-y-6">
      <Header
        title="Edit Company"
        subtitle={company.name}
      />

      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Company name"
                placeholder="Acme Inc."
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="Website URL"
                placeholder="https://acme.com"
                error={errors.websiteUrl?.message}
                {...register('websiteUrl')}
              />
            </div>
            <Input
              label="Industry"
              placeholder="e.g. B2B SaaS, E-commerce, Healthcare"
              error={errors.industry?.message}
              {...register('industry')}
            />
          </CardContent>
        </Card>

        {/* Context */}
        <Card>
          <CardHeader>
            <CardTitle>Company Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              label="Target audience"
              placeholder="Who are your ideal customers? What problems do they have?"
              rows={3}
              error={errors.targetAudience?.message}
              {...register('targetAudience')}
            />
            <Textarea
              label="Products & services"
              placeholder="What do you offer? Key features and use cases?"
              rows={3}
              error={errors.productsServices?.message}
              {...register('productsServices')}
            />
            <Textarea
              label="Key differentiators"
              placeholder="What makes you stand out from competitors?"
              rows={3}
              error={errors.keyDifferentiators?.message}
              {...register('keyDifferentiators')}
            />
            <Textarea
              label="Brand voice notes (optional)"
              placeholder="Tone, style, words to use/avoid, etc."
              rows={2}
              {...register('brandVoiceNotes')}
            />
          </CardContent>
        </Card>

        {/* Competitors */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Competitors (up to 5)</CardTitle>
              {fields.length < 5 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => append({ name: '', websiteUrl: '' })}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add competitor
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.length === 0 ? (
              <p className="text-sm text-gray-500">
                No competitors added. Adding competitors lets us compare share of voice.
              </p>
            ) : (
              fields.map((field, i) => (
                <div key={field.id} className="flex items-start gap-3">
                  <div className="grid flex-1 grid-cols-2 gap-3">
                    <Input
                      placeholder="Competitor name (optional)"
                      error={errors.competitors?.[i]?.name?.message}
                      {...register(`competitors.${i}.name`)}
                    />
                    <Input
                      placeholder="https://competitor.com"
                      error={errors.competitors?.[i]?.websiteUrl?.message}
                      {...register(`competitors.${i}.websiteUrl`)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="mt-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push(`/companies/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
