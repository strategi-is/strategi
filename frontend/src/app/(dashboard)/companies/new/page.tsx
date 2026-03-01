'use client';

import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { companyApi } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

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

export default function NewCompanyPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { competitors: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'competitors' });

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      const res = await companyApi.create(data);
      router.push(`/companies/${res.data.data.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create company';
      setServerError(msg);
    }
  }

  return (
    <div className="space-y-6">
      <Header title="Add Company" subtitle="Set up a company profile for GEO analysis" />

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
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Create company
          </Button>
        </div>
      </form>
    </div>
  );
}
